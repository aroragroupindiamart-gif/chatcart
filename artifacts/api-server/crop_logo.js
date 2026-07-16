import sharp from 'sharp';

const inputPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\38d4b4b7-7076-414c-a119-4732fd7a5107\\media__1784114333464.png';
const outputPath = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\38d4b4b7-7076-414c-a119-4732fd7a5107\\media__1784114333464_cropped.png';

async function crop() {
  try {
    console.log('Trimming logo margins...');
    await sharp(inputPath)
      .trim({ background: '#ffffff', threshold: 15 })
      .extend({
        top: 24,
        bottom: 24,
        left: 24,
        right: 24,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(outputPath);
    console.log('Logo cropped successfully!');
  } catch (err) {
    console.error('Error cropping logo:', err);
  }
}

crop();
