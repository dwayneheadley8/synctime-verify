import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RefreshCw,
  MessageSquare,
  Monitor,
  AlertCircle,
  Play,
  Pause,
  ChevronDown
} from './ui/Icons';

interface LandingPageProps {
  onGetStarted: () => void;
}

// --- Visual Components ---

const ControlTowerVisual = () => (
  <div className="relative w-full max-w-2xl mx-auto lg:mx-0 animate-fade-in-up">
    {/* Main Dashboard Window */}
    <div className="bg-[#1f2937] rounded-3xl border border-gray-700 shadow-2xl overflow-hidden relative z-10">
      {/* Window Header */}
      <div className="bg-[#111827] px-4 py-2 flex items-center gap-2 border-b border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
        </div>
        <div className="mx-auto text-[10px] text-gray-500 font-medium bg-[#1f2937] px-3 py-0.5 rounded-full">
          AI Control Tower
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6 bg-slate-50 text-slate-800 h-[600px] relative overflow-hidden rounded-b-3xl">
        <h3 className="font-bold text-2xl mb-6 text-slate-900">Welcome to AI Control Tower</h3>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 text-sm font-medium text-gray-500">
          <div className="pb-2 border-b-2 border-[#82e761] text-slate-900 px-4">Value</div>
          <div className="pb-2 px-4 hover:text-slate-700 cursor-pointer">Adoption</div>
          <div className="pb-2 px-4 hover:text-slate-700 cursor-pointer">Risk & Compliance</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Card 1 – Productivity */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Productivity</p>
            <div className="text-3xl font-bold text-slate-800 flex items-baseline gap-1">
              <span className="text-green-600 text-xl">↗</span> 532 hrs
            </div>
            <div className="mt-4 h-12 flex items-end gap-1 opacity-50">
              {[40, 60, 45, 70, 65, 80, 75].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-green-500/40 rounded-t-lg"></div>
              ))}
            </div>
          </div>
          {/* Card 2 – Avg AI Users */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Avg AI Users</p>
            <div className="text-3xl font-bold text-slate-800 flex items-baseline gap-1">
              <span className="text-green-600 text-xl">↗</span> 7,422
            </div>
            <div className="mt-4 h-12 flex items-end gap-1 opacity-50">
              {[30, 40, 35, 50, 60, 75, 90].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-green-500/40 rounded-t-lg"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3 – Automated Resolutions Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-2">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-4">Automated Resolutions</p>
          <div className="h-32 w-full flex items-end gap-2 px-2">
            {[30, 45, 25, 60, 40, 75, 50, 85, 65, 95, 70, 80].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 bg-gradient-to-t from-[#1b998b] to-[#2ecc71] rounded-t-lg opacity-80 hover:opacity-100 transition-opacity shadow-sm"
              />
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Abstract Shapes behind */}
    <div className="absolute -left-16 -bottom-16 z-0 animate-pulse">
      <Sparkles className="w-32 h-32 text-[#82e761]/20" />
    </div>
  </div>
);

const IssueDetectedVisual = () => (
  <div className="relative animate-fade-in-up">
    {/* Main Card */}
    <div className="bg-white rounded-[40px] p-2 shadow-2xl relative overflow-hidden max-w-lg mx-auto lg:mx-0">
      <div className="bg-[#f8fafc] rounded-[32px] p-6 text-[#1f2937]">
        {/* Card Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Issue Detected</h3>
            <p className="text-sm text-gray-500 leading-snug">
              Employee #402 submitted 80 hours with a potential scheduling clash.
            </p>
          </div>
        </div>

        {/* Actions Taken Section */}
        <div className="space-y-3 mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actions Taken</p>
          <div className="bg-[#e0f2fe] rounded-xl p-4 border-l-4 border-sky-500 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-semibold text-sky-900 mb-1">Clash Identified</h4>
              <p className="text-sm text-sky-800">Overlap of 2.5 hours with User B detected.</p>
            </div>
          </div>
          <div className="bg-[#fefce8] rounded-xl p-4 border-l-4 border-yellow-400 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="font-semibold text-yellow-900 mb-1">Flagged for Review</h4>
              <p className="text-sm text-yellow-800">Timesheet held from auto-approval queue.</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex gap-4">
            <ThumbsUp className="w-5 h-5 text-gray-400 hover:text-[#031b29] cursor-pointer" />
            <ThumbsDown className="w-5 h-5 text-gray-400 hover:text-[#031b29] cursor-pointer" />
          </div>
          <div className="flex gap-4">
            <Copy className="w-5 h-5 text-gray-400 hover:text-[#031b29] cursor-pointer" />
            <RefreshCw className="w-5 h-5 text-gray-400 hover:text-[#031b29] cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BrandsSection = () => {
  const brandsRow1 = [
    { name: 'Uber', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Uber_logo_2018.png/1200px-Uber_logo_2018.png' },
    { name: 'Delta', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Delta_logo.svg/1200px-Delta_logo.svg.png' },
    { name: 'Google', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png' },
    { name: 'Microsoft', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/1200px-Microsoft_logo_%282012%29.svg.png' },
    { name: 'Amazon', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1200px-Amazon_logo.svg.png' },
    { name: 'Visa', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/1200px-Visa_Inc._logo.svg.png' }
  ];

  const brandsRow2 = [
    { name: 'Microsoft', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/1200px-Microsoft_logo_%282012%29.svg.png' },
    { name: 'Amazon', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1200px-Amazon_logo.svg.png' },
    { name: 'Uber', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Uber_logo_2018.png/1200px-Uber_logo_2018.png' },
    { name: 'Google', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/1200px-Google_2015_logo.svg.png' },
    { name: 'Visa', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/1200px-Visa_Inc._logo.svg.png' },
    { name: 'Delta', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Delta_logo.svg/1200px-Delta_logo.svg.png' }
  ];

  return (
    <section className="bg-[#031b29] pt-16 pb-32 px-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto text-center">
        <h2 className="text-4xl lg:text-6xl font-extrabold mb-16 text-white tracking-tighter leading-tight">
          The <span className="text-[#82e761]">World</span> works with SyncTime
        </h2>

        {/* Row 1 - Forward Scrolling */}
        <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] overflow-hidden mb-8 pointer-events-none py-4">
          <div className="flex gap-16 lg:gap-32 animate-scroll whitespace-nowrap w-max items-center">
            {[...Array(2)].map((_, groupIdx) => (
              <React.Fragment key={groupIdx}>
                {brandsRow1.map((brand, i) => (
                  <div key={`${groupIdx}-${i}`} className="inline-block px-4 grayscale brightness-0 invert opacity-60 hover:opacity-100 transition-opacity">
                    <img
                      src={brand.url}
                      className="h-7 lg:h-10 w-auto object-contain"
                      alt={brand.name}
                    />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Row 2 - Reverse Scrolling */}
        <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] overflow-hidden mb-24 pointer-events-none py-4">
          <div className="flex gap-16 lg:gap-32 animate-scroll-reverse whitespace-nowrap w-max items-center">
            {[...Array(2)].map((_, groupIdx) => (
              <React.Fragment key={groupIdx}>
                {brandsRow2.map((brand, i) => (
                  <div key={`${groupIdx}-${i}`} className="inline-block px-4 grayscale brightness-0 invert opacity-60 hover:opacity-100 transition-opacity">
                    <img
                      src={brand.url}
                      className="h-7 lg:h-10 w-auto object-contain"
                      alt={brand.name}
                    />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const CarouselVisual = () => (
  <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] overflow-hidden py-6">
    <div className="flex gap-8 animate-scroll whitespace-nowrap w-max">
      {[...Array(2)].map((_, groupIdx) => (
        <React.Fragment key={groupIdx}>
          {[
            'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200',
            'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200',
            'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200',
            'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200'
          ].map((src, i) => (
            <div key={`${groupIdx}-${i}`} className="inline-block px-4">
              <img
                src={src}
                className="h-[250px] lg:h-[400px] w-auto rounded-2xl shadow-2xl object-cover pointer-events-none"
                alt={`Slide ${i}`}
              />
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  </div>
);

// --- Data ---

const SLIDES = [
  {
    id: 1,
    headline: "AI you can trust.\nOutcomes you control.",
    subhead: "Govern every AI in your enterprise, first or third party, with SyncTime AI Control Tower. A single view to align strategy, manage risk, and drive AI results with confidence.",
    primaryCta: "See AI Control Tower",
    secondaryCta: "Explore Platform",
    VisualComponent: ControlTowerVisual,
    layout: 'split'
  },
  {
    id: 2,
    headline: "Run your workforce accuracy on the SyncTime AI Platform",
    subhead: "Bring your AI, timesheets, and workflows together with automation for more efficient core administrative functions.",
    primaryCta: "Explore Solutions",
    secondaryCta: null,
    VisualComponent: IssueDetectedVisual,
    layout: 'split'
  },
  {
    id: 3,
    headline: "Transforming work.",
    subhead: "Empower your teams with AI-driven insights and automated workflows that simplify complex administrative tasks and drive measurable productivity gains.",
    primaryCta: null,
    secondaryCta: null,
    VisualComponent: CarouselVisual,
    layout: 'stacked'
  }
];

const SLIDE_DURATION = 6000; // 6 seconds

// --- Main Component ---

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-advance logic
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length);
      }, SLIDE_DURATION);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSlideIndex]);

  return (
    <div className="min-h-screen bg-[#031b29] text-white font-sans overflow-x-hidden selection:bg-[#82e761] selection:text-[#031b29]">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-[#031b29]/95 backdrop-blur-sm border-b border-white/10 h-20 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onGetStarted}>
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
                <span className="text-[#031b29] font-bold text-xl">S</span>
              </div>
              <span className="text-2xl font-bold tracking-tight font-montserrat">SyncTime</span>
            </div>

            <div className="hidden lg:flex items-center gap-8 text-[15px] font-medium text-gray-300">
              <a href="#" className="hover:text-white transition-colors flex items-center gap-1.5 group">
                Products <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
              <a href="#" className="hover:text-white transition-colors flex items-center gap-1">Partners</a>
              <a href="#" className="hover:text-white transition-colors flex items-center gap-1.5 group">
                Support <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Search className="w-5 h-5 text-gray-300 hover:text-white cursor-pointer" />
            <Globe className="w-5 h-5 text-gray-300 hover:text-white cursor-pointer" />
            <button
              onClick={(e) => { e.preventDefault(); onGetStarted(); }}
              className="hidden md:block text-[15px] font-medium hover:text-[#82e761] transition-colors bg-transparent border-none cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="bg-[#82e761] hover:bg-[#6fd650] text-[#031b29] px-6 py-2.5 rounded-full text-[15px] font-semibold transition-all shadow-[0_0_15px_rgba(130,231,97,0.3)]"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Slider Section */}
      <main className="relative pt-24 pb-12 lg:pt-32 lg:pb-24 px-6 min-h-[90vh] flex flex-col justify-start overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[80%] h-[120%] bg-gradient-to-b from-[#0f4c75] to-[#1b998b] opacity-20 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/4 -z-10 pointer-events-none transition-all duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-[60%] h-[80%] bg-gradient-to-tr from-[#031b29] via-[#083344] to-[#115e59] opacity-40 -z-20 pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto w-full relative">

          {/* Static Slider Controls - Always left-aligned */}
          <div className="flex items-center gap-6 mb-6 lg:mb-8 relative z-50 justify-start">
            <div className="flex items-center gap-3">
              {SLIDES.map((_, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCurrentSlideIndex(index);
                  }}
                  className="relative w-6 h-6 flex items-center justify-center cursor-pointer group"
                  role="button"
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${index === currentSlideIndex ? 'bg-[#82e761]' : 'bg-white/40 group-hover:bg-white'}`} />

                  {index === currentSlideIndex && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
                      <circle
                        cx="12" cy="12" r="10"
                        fill="none"
                        stroke="#82e761"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="62.83"
                        strokeDashoffset="62.83"
                        style={{
                          animation: `progress-ring ${SLIDE_DURATION}ms linear forwards`,
                          animationPlayState: isPlaying ? 'running' : 'paused'
                        }}
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:border-white/50 transition-all hover:bg-white/5"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
          </div>

          <div className="relative h-[1000px] lg:h-[750px]">
            {SLIDES.map((slide, index) => {
              const isSlideActive = index === currentSlideIndex;
              const isSlideStacked = slide.layout === 'stacked';
              const Visual = slide.VisualComponent;

              return (
                <div
                  key={slide.id}
                  className={`transition-opacity duration-1000 absolute top-1/2 -translate-y-1/2 w-full left-0 ${isSlideActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                >
                  <div className={`${isSlideStacked ? 'flex flex-col items-start text-left' : 'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center'}`}>

                    {/* Left Content Area */}
                    <div className={`${isSlideStacked ? 'max-w-4xl w-full flex flex-col items-start' : 'max-w-2xl w-full'}`}>
                      <h1 className={`font-montserrat text-5xl lg:text-[72px] leading-[0.95] font-extrabold tracking-tighter ${isSlideStacked ? 'mb-4 lg:mb-6' : 'mb-8 whitespace-pre-line'}`}>
                        {slide.headline}
                      </h1>
                      {slide.subhead && (
                        <p className="text-xl text-gray-300 mb-10 leading-relaxed font-light">
                          {slide.subhead}
                        </p>
                      )}

                      {(slide.primaryCta || slide.secondaryCta) && (
                        <div className={`flex flex-col sm:flex-row gap-4 mb-16 ${isSlideStacked ? 'justify-start' : ''}`}>
                          {slide.primaryCta && (
                            <button
                              onClick={onGetStarted}
                              className="bg-[#82e761] hover:bg-[#6fd650] hover:scale-105 text-[#031b29] px-8 py-3.5 rounded-full text-lg font-bold transition-all shadow-[0_4px_20px_rgba(130,231,97,0.4)]"
                            >
                              {slide.primaryCta}
                            </button>
                          )}
                          {slide.secondaryCta && (
                            <button
                              className="border border-white/30 hover:bg-white/10 text-white px-8 py-3.5 rounded-full text-lg font-medium transition-all"
                            >
                              {slide.secondaryCta}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Visual Area */}
                    <div className={`${isSlideStacked ? 'w-full mt-8' : 'min-h-[400px] flex items-center justify-center relative w-full'}`}>
                      <Visual />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <BrandsSection />
    </div>
  );
};

export default LandingPage;