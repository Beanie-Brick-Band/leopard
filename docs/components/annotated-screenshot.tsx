type Annotation = {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
};

interface AnnotatedScreenshotProps {
  src: string;
  alt: string;
  imageWidth: number;
  imageHeight: number;
  title: string;
  annotations: Annotation[];
}

const COLORS = [
  "rgb(37 99 235)",
  "rgb(249 115 22)",
  "rgb(16 185 129)",
  "rgb(225 29 72)",
];

function toPercent(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

const Y_OFFSET = 52;

export function AnnotatedScreenshot({
  src,
  alt,
  imageWidth,
  imageHeight,
  title,
  annotations,
}: AnnotatedScreenshotProps) {
  return (
    <figure className="my-6 overflow-hidden rounded-xl border bg-white shadow-sm">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
      >
        <img
          src={src}
          alt={alt}
          width={imageWidth}
          height={imageHeight}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <div className="absolute inset-0">
          {annotations.map((annotation, index) => {
            const color = COLORS[index % COLORS.length];
            return (
              <div key={`${annotation.text}-${index}`}>
                <div
                  className="absolute rounded-[18px] border-[3px]"
                  style={{
                    borderColor: color,
                    left: toPercent(annotation.x, imageWidth),
                    top: toPercent(annotation.y + Y_OFFSET, imageHeight),
                    width: toPercent(annotation.width, imageWidth),
                    height: toPercent(annotation.height, imageHeight),
                  }}
                />
                <div
                  className="absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-white shadow-sm"
                  style={{
                    backgroundColor: color,
                    left: `calc(${toPercent(annotation.x, imageWidth)} - 12px)`,
                    top: `calc(${toPercent(annotation.y + Y_OFFSET, imageHeight)} - 12px)`,
                  }}
                >
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <figcaption className="space-y-3 border-t bg-slate-950 px-5 py-4 text-slate-100">
        <p className="text-base font-semibold">{title}</p>
        <ol className="space-y-2 text-sm leading-6">
          {annotations.map((annotation, index) => {
            const color = COLORS[index % COLORS.length];
            return (
              <li
                key={`${annotation.text}-note-${index}`}
                className="flex gap-3"
              >
                <span
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </span>
                <span>{annotation.text}</span>
              </li>
            );
          })}
        </ol>
      </figcaption>
    </figure>
  );
}
