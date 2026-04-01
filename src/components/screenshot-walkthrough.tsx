import Image from 'next/image';

const screens = [
  {
    src: '/screenshots/artists.png',
    alt: 'Artists page showing tracked artists with resolved status from setlist.fm',
    title: 'add your artists once',
    description:
      'search setlist.fm and add the artists you write for. this is a one-time setup — once added, we\'ll keep scanning for new performances automatically.',
  },
  {
    src: '/screenshots/songs.png',
    alt: 'Songs page showing registered songs linked to artists with BMI work IDs',
    title: 'register your songs',
    description:
      'add your songs and link them to artists. include your bmi or ascap work id if you have it. like artists, you only do this once — unless you release new music.',
  },
  {
    src: '/screenshots/performances.png',
    alt: 'Performances table showing discovered and confirmed live performances with venue and status',
    title: 'we find your performances',
    description:
      'hit scan and we search setlist.fm\'s 9.6m+ setlists for concerts where your songs were played. review matches, confirm the real ones, and track submission status.',
  },
  {
    src: '/screenshots/export.png',
    alt: 'Submit page showing Chrome extension auto-fill and CSV export for BMI Live',
    title: 'submit & collect royalties',
    description:
      'use the chrome extension to auto-fill bmi live forms directly from your confirmed performances. prefer manual? download a csv instead. you stay in control — we never submit on your behalf.',
  },
];

export function ScreenshotWalkthrough() {
  return (
    <section className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-[11px] text-text-muted tracking-[2px] uppercase">
          see it in action
        </h2>
        <p className="text-[12px] text-text-secondary max-w-[400px] mx-auto leading-[1.5]">
          set up your artists and songs once, then let us handle the rest.
        </p>
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
