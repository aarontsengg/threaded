import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { budgetTracker } from '@/lib/budget-tracker';

fal.config({
  credentials: process.env.FAL_KEY
});

// Estimated costs (in USD)
const ESTIMATED_COST_TRYON = 0.05;
const ESTIMATED_COST_GENERATE = 0.03;

export async function POST(req: NextRequest) {
  console.log('Processing virtual try-on request:');

  try {
    const contentType = req.headers.get('content-type') || '';

    let humanImage: string | File;
    let garmentImage: string | File | null = null;
    let garmentDescription: string | null = null;
    let garmentType: 'upper_body' | 'lower_body' | 'dresses';

    // Handle both JSON and FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const humanFile = formData.get('humanImage');
      const garmentFile = formData.get('garmentImage');
      const humanUrl = formData.get('humanImageUrl') as string | null;
      const garmentUrl = formData.get('garmentImageUrl') as string | null;
      garmentDescription = formData.get('garmentDescription') as string | null;
      garmentType = (formData.get('garmentType') as string || 'upper_body') as 'upper_body' | 'lower_body' | 'dresses';

      // Human image: prefer file, fallback to URL
      if (humanFile instanceof File) {
        humanImage = humanFile;
      } else if (humanUrl) {
        humanImage = humanUrl;
      } else {
        return NextResponse.json(
          { error: 'Must provide humanImage file or humanImageUrl' },
          { status: 400 }
        );
      }

      // Garment: prefer file, then URL, then description
      if (garmentFile instanceof File) {
        garmentImage = garmentFile;
      } else if (garmentUrl) {
        garmentImage = garmentUrl;
      }
      // If no garment image, we'll generate from description later

    } else {
      // JSON body
      const body = await req.json();
      humanImage = body.humanImageUrl;
      garmentImage = body.garmentImageUrl || null;
      garmentDescription = body.garmentDescription || null;
      garmentType = body.garmentType || 'upper_body';

      if (!humanImage) {
        return NextResponse.json(
          { error: 'Missing required field: humanImageUrl' },
          { status: 400 }
        );
      }
    }

    // Must have either garment image or description
    if (!garmentImage && !garmentDescription) {
      return NextResponse.json(
        { error: 'Must provide garmentImage/garmentImageUrl or garmentDescription' },
        { status: 400 }
      );
    }

    // Get user ID
    const userId = req.headers.get('x-session-id') ||
                   req.headers.get('x-forwarded-for')?.split(',')[0] ||
                   req.headers.get('x-real-ip') ||
                   'anonymous';
    console.log(`User ID: ${userId}`);

    // Calculate cost
    const willNeedGeneration = !garmentImage && !!garmentDescription;
    const totalCost = willNeedGeneration
      ? ESTIMATED_COST_TRYON + ESTIMATED_COST_GENERATE
      : ESTIMATED_COST_TRYON;

    // Check user budget
    const budgetCheck = budgetTracker.checkBudget(userId, totalCost);
    console.log('User budget check:', budgetCheck);

    if (!budgetCheck.hasEnough) {
      return NextResponse.json({
        success: false,
        error: 'User budget limit reached',
        userBudget: {
          spent: budgetCheck.spent,
          remaining: budgetCheck.remaining,
          limit: budgetCheck.limit
        },
        estimatedCost: totalCost
      }, { status: 402 });
    }

    // Upload files to fal.ai storage if needed
    let humanImageUrl: string;
    let garmentImageUrl: string | null = null;
    let generatedGarmentUrl: string | null = null;

    // Handle human image
    if (humanImage instanceof File) {
      console.log('Uploading human image to fal.ai storage...');
      const humanBuffer = await humanImage.arrayBuffer();
      const humanBlob = new Blob([humanBuffer], { type: humanImage.type });
      humanImageUrl = await fal.storage.upload(humanBlob);
      console.log('Human image uploaded:', humanImageUrl);
    } else {
      humanImageUrl = humanImage;
    }

    // Handle garment image
    if (garmentImage instanceof File) {
      console.log('Uploading garment image to fal.ai storage...');
      const garmentBuffer = await garmentImage.arrayBuffer();
      const garmentBlob = new Blob([garmentBuffer], { type: garmentImage.type });
      garmentImageUrl = await fal.storage.upload(garmentBlob);
      console.log('Garment image uploaded:', garmentImageUrl);
    } else if (typeof garmentImage === 'string') {
      garmentImageUrl = garmentImage;
    }

    // Generate garment from description if needed
    const needsGeneration = !garmentImageUrl && !!garmentDescription;

    if (needsGeneration) {
      console.log('Generating garment image from description...');
      const generateResult = await fal.subscribe('fal-ai/flux/schnell', {
        input: {
          prompt: `Product photo of ${garmentDescription}, clothing item on white background, fashion photography, high quality`,
          image_size: 'square_hd',
          num_images: 1
        },
        logs: true
      });

      generatedGarmentUrl = (generateResult.data as any).images[0].url as string;
      garmentImageUrl = generatedGarmentUrl;
      console.log('Generated garment image:', generatedGarmentUrl);
    }

    // Call fal.ai virtual try-on API
    console.log('Calling fal.ai virtual try-on...');
    const tryOnResult = await fal.subscribe('fal-ai/leffa/virtual-tryon', {
      input: {
        human_image_url: humanImageUrl,
        garment_image_url: garmentImageUrl!,
        garment_type: garmentType
      },
      logs: true
    });

    console.log('Virtual try-on completed successfully!');

    // Record spending
    budgetTracker.recordSpending(userId, totalCost);
    const updatedBudget = budgetTracker.checkBudget(userId, 0);

    return NextResponse.json({
      success: true,
      result: {
        imageUrl: tryOnResult.data.image.url,
        width: tryOnResult.data.image.width,
        height: tryOnResult.data.image.height,
        seed: tryOnResult.data.seed,
        hasNsfwConcepts: tryOnResult.data.has_nsfw_concepts
      },
      generatedGarment: generatedGarmentUrl,
      cost: totalCost,
      userBudget: {
        spent: updatedBudget.spent,
        remaining: updatedBudget.remaining,
        limit: updatedBudget.limit
      },
      metadata: {
        userId,
        garmentType,
        usedDescription: needsGeneration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing try-on request:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'virtual-tryon',
    features: ['fal-ai-integration', 'file-upload', 'text-to-garment'],
    costs: {
      tryOn: ESTIMATED_COST_TRYON,
      generate: ESTIMATED_COST_GENERATE
    }
  });
}
