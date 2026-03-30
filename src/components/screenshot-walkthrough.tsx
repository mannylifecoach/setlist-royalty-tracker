import Image from 'next/image';

const screens = [
  {
    src: '/screenshots/dashboard.jpg',
    alt: 'Performance dashboard showing tracked concerts, matched songs, and submission status',
    title: 'track every performance',
    description:
      'see all your matched concerts in one place — artist, venue, date, songs matched, and submission status at a glance.',
  },
  {
    src: '/screenshots/export.jpg',
    alt: 'BMI Live export screen showing setlist data and CSV preview',
    title: 'export & submit in seconds',
    description:
      'one-click export to bmi live or ascap onstage format. review the csv preview, then submit — no manual data entry.',
  },
];

export function ScreenshotWalkthrough() {
  return (
    <section className="space-y-8">
      <div className="text-center">
        <h2 className="text-[11px] text-text-muted tracking-[2px] uppercase">
          see it in action
        </h2>
      </div>

      <div className="space-y-10">
        {screens.map((screen, i) => (
          <div key={screen.title} className="space-y-4">
            <div className="border border-border-subtle overflow-hidden">
              <Image
                src={screen.src}
                alt={screen.alt}
                width={1280}
                height={720}
                className="w-full h-auto"
              />
            </div>
            <div className="text-center space-y-2">
              <div className="text-[11px] text-text-disabled">
                0{i + 1}
              </div>
              <h3 className="text-[15px] font-normal tracking-[-0.3px]">
                {screen.title}
              </h3>
              <p className="text-[12px] text-text-secondary leading-[1.5] max-w-[460px] mx-auto">
                {screen.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
