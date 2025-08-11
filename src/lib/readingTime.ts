// content reading
const readingTime = (content: string, complexity: number): string => {
  const WPS = 200 / 60;

  // Count images by common extensions (markdown/image links)
  const imageMatches = content.match(/\.(png|jpe?g|svg|webp|gif)/gi);
  let images = imageMatches ? imageMatches.length : 0;

  const wordRegex = /\w/;
  const words = content
    .split(/\s+/)
    .filter((word) => wordRegex.test(word)).length;

  // Additional seconds for images, diminishing per image
  let imageSecs = 0;
  let imageFactor = 12;
  while (images > 0) {
    imageSecs += imageFactor;
    if (imageFactor > 3) imageFactor -= 1;
    images -= 1;
  }

  // time to read (in minutes)
  let ttr = 0;
  ttr = words / WPS; // seconds
  ttr = ttr + imageSecs; // seconds
  ttr = ttr * complexity; // seconds
  ttr = Math.ceil(ttr / 60); // minutes

  return ttr < 2 ? `${ttr} min` : `${ttr} mins`;
};

export default readingTime;
