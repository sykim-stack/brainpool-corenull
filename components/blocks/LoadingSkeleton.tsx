'use client'

export function PageLoadingSkeleton() {
  return (
    <div className="cn-loading-page" role="status" aria-label="화면 불러오는 중" aria-busy="true">
      <div className="cn-loading-hero" aria-hidden="true">
        <div className="cn-skeleton cn-loading-hero__cover" />
        <div className="cn-skeleton cn-loading-hero__avatar" />
        <div className="cn-skeleton cn-loading-hero__title" />
        <div className="cn-skeleton cn-loading-hero__meta" />
      </div>
      <ContentLoadingSkeleton sections={2} />
    </div>
  )
}

export function ContentLoadingSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div className="cn-loading-sections" aria-hidden="true">
      {Array.from({ length: sections }, (_, sectionIndex) => (
        <section className="cn-loading-section" key={sectionIndex}>
          <div className="cn-skeleton cn-loading-section__heading" />
          <div className="cn-loading-section__cards">
            {Array.from({ length: 2 }, (_, cardIndex) => (
              <div className="cn-skeleton cn-loading-section__card" key={cardIndex} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
