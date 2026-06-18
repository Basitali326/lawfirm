export default function InnerPageHero({ eyebrow, title, description }) {
  return (
    <section className="bg-[#111b2d] px-5 py-20 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#dfc18b]">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight md:text-6xl">{title}</h1>
        {description ? <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{description}</p> : null}
      </div>
    </section>
  );
}
