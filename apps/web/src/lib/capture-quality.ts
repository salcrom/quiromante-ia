export type CaptureQualityResult = {
  width: number;
  height: number;
  accepted: boolean;
  brightness: number;
  contrast: number;
  sharpness: number;
  aspectRatio: number;
  issues: string[];
};

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se ha podido decodificar la imagen en este dispositivo."));
    };
    image.src = url;
  });
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export async function analyzeCaptureQuality(file: File): Promise<CaptureQualityResult> {
  const image = await loadImage(file);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const longest = Math.max(width, height);
  const scale = Math.min(1, 512 / longest);
  const sampleWidth = Math.max(1, Math.round(width * scale));
  const sampleHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No se ha podido analizar la calidad de la imagen.");
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

  const luminance = new Float32Array(sampleWidth * sampleHeight);
  let sum = 0;
  for (let pixel = 0, index = 0; pixel < data.length; pixel += 4, index += 1) {
    const value = 0.2126 * data[pixel] + 0.7152 * data[pixel + 1] + 0.0722 * data[pixel + 2];
    luminance[index] = value;
    sum += value;
  }

  const brightness = sum / luminance.length;
  let varianceSum = 0;
  for (const value of luminance) varianceSum += (value - brightness) ** 2;
  const contrast = Math.sqrt(varianceSum / luminance.length);

  let laplacianSum = 0;
  let laplacianSquaredSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const i = y * sampleWidth + x;
      const laplacian =
        luminance[i - sampleWidth] +
        luminance[i + sampleWidth] +
        luminance[i - 1] +
        luminance[i + 1] -
        4 * luminance[i];
      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian ** 2;
      laplacianCount += 1;
    }
  }
  const laplacianMean = laplacianCount ? laplacianSum / laplacianCount : 0;
  const sharpness = laplacianCount ? laplacianSquaredSum / laplacianCount - laplacianMean ** 2 : 0;
  const aspectRatio = width / height;

  const issues: string[] = [];
  const shortest = Math.min(width, height);
  if (shortest < 900 || longest < 1200) issues.push("Resolución insuficiente: usa al menos 1200 px en el lado largo y 900 px en el corto.");
  if (brightness < 55) issues.push("La imagen está demasiado oscura; aumenta la iluminación ambiental.");
  if (brightness > 220) issues.push("La imagen está sobreexpuesta; evita luz directa o reflejos.");
  if (contrast < 24) issues.push("Hay poco contraste; usa una luz más uniforme y un fondo diferenciado.");
  if (sharpness < 55) issues.push("La imagen parece desenfocada o movida; estabiliza el móvil y enfoca la palma.");
  if (aspectRatio < 0.5 || aspectRatio > 2) issues.push("El encuadre es demasiado estrecho; incluye muñeca, palma y dedos completos.");

  return {
    width,
    height,
    accepted: issues.length === 0,
    brightness: round(brightness),
    contrast: round(contrast),
    sharpness: round(sharpness),
    aspectRatio: round(aspectRatio),
    issues,
  };
}
