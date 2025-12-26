import { ArrowRight, Menu, Shield, Users, X, Zap } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const fadeInUp = {
  initial: { opacity: 0, y: 20, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const NetworkBackground = () => {
  const [nodes, setNodes] = useState<{ x: number; y: number }[]>([])
  const [transactions, setTransactions] = useState<{ id: number; start: number; end: number }[]>([])

  useEffect(() => {
    // Generate fewer static nodes for better performance
    const newNodes = Array.from({ length: 12 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    }))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNodes(newNodes)

    // Simulate transactions less frequently for better performance
    const interval = setInterval(() => {
      if (newNodes.length < 2) return
      const start = Math.floor(Math.random() * newNodes.length)
      let end = Math.floor(Math.random() * newNodes.length)
      while (end === start) end = Math.floor(Math.random() * newNodes.length)

      const id = Date.now()
      setTransactions((prev) => [...prev, { id, start, end }])

      // Cleanup old transactions
      setTimeout(() => {
        setTransactions((prev) => prev.filter((t) => t.id !== id))
      }, 2000)
    }, 1000) // Reduced from 500ms to 1000ms

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#050507]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem',
        }}
      />

      <svg className="absolute inset-0 w-full h-full opacity-30">
        {/* Nodes */}
        {nodes.map((node, i) => (
          <circle
            key={i}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r="2"
            fill="#ffffff"
            opacity="0.2"
          />
        ))}

        {/* Active Transactions */}
        {transactions.map((t) => {
          const startNode = nodes[t.start]
          const endNode = nodes[t.end]
          if (!startNode || !endNode) return null

          return (
            <g key={t.id}>
              {/* Connection Line */}
              <motion.line
                x1={`${startNode.x}%`}
                y1={`${startNode.y}%`}
                x2={`${endNode.x}%`}
                y2={`${endNode.y}%`}
                stroke="url(#gradient-line)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              />

              {/* Moving Packet */}
              <motion.circle
                r="3"
                fill="#dfff4f"
                initial={{ cx: `${startNode.x}%`, cy: `${startNode.y}%` }}
                animate={{ cx: `${endNode.x}%`, cy: `${endNode.y}%` }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </g>
          )
        })}

        <defs>
          <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dfff4f" stopOpacity="0" />
            <stop offset="50%" stopColor="#dfff4f" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#dfff4f" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Radial fade out */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050507_90%)]" />
    </div>
  )
}

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, -50])

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#050507] text-[#f0f0f0] font-mono selection:bg-[#dfff4f] selection:text-black overflow-x-hidden relative"
    >
      <NetworkBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050507]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-display font-bold tracking-tight text-[#dfff4f]">
            PayUp.
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/auth/login"
              className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/auth/register"
              className="group relative px-6 py-3 rounded-xl bg-[#dfff4f] text-black text-xs font-bold uppercase tracking-widest overflow-hidden transition-all hover:bg-[#ccee3e]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 text-white hover:text-[#dfff4f] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-[#050507] p-6 flex flex-col gap-6"
          >
            <Link to="/auth/login" className="text-sm font-bold uppercase tracking-widest text-gray-400">Log In</Link>
            <Link to="/auth/register" className="text-sm font-bold uppercase tracking-widest text-[#dfff4f]">Get Started</Link>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-60 md:pb-40 px-6">
        <motion.div style={{ y }} className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-5xl"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-widest font-bold mb-10 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#dfff4f] animate-pulse" />
              Now available in beta
            </motion.div>

            <motion.h1 variants={fadeInUp} className="font-display text-5xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tighter mb-10 text-white">
              SPLIT BILLS, <br />
              <span className="text-[#dfff4f] italic relative inline-block">
                KEEP FRIENDS.
                <motion.span
                  className="absolute -bottom-2 left-0 w-full h-[2px] bg-[#dfff4f]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.8, ease: "circOut" }}
                />
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-sm md:text-base text-gray-400 max-w-xl mb-12 leading-loose tracking-wide uppercase">
              The acid-test for shared expenses. <br className="hidden md:block" />
              No awkward conversations, just seamless settlement.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                to="/auth/register"
                className="w-full sm:w-auto h-14 px-10 rounded-xl bg-[#dfff4f] text-black font-bold uppercase tracking-widest text-xs flex items-center justify-center hover:bg-[#ccee3e] transition-colors shadow-[0_0_20px_rgba(223,255,79,0.2)]"
              >
                Start for free
              </Link>
              <Link
                to="/about"
                className="w-full sm:w-auto h-14 px-10 rounded-xl border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm"
              >
                How it works
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 md:py-32 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Instant Settlement",
                desc: "Settle up with a single tap. Real-time transfers."
              },
              {
                icon: Users,
                title: "Group Dynamics",
                desc: "Perfect for roommates, trips, or dinners."
              },
              {
                icon: Shield,
                title: "Bank-Grade Security",
                desc: "Your financial data is encrypted and protected."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                viewport={{ once: true }}
                className="group p-8 md:p-10 bg-[#131316]/80 backdrop-blur-sm border border-white/10 rounded-3xl shadow-2xl hover:border-[#dfff4f]/50 transition-colors relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity text-white font-display text-6xl font-bold text-[#2a2a30] group-hover:text-[#dfff4f]/20 pointer-events-none">
                  0{i + 1}
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-[#1c1c21] flex items-center justify-center mb-8 border border-white/5 group-hover:border-[#dfff4f] group-hover:bg-[#dfff4f] transition-all">
                    <feature.icon className="w-5 h-5 text-white group-hover:text-black transition-colors" />
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-[80%]">{feature.desc}</p>
                </div>

                {/* Hover Beam Effect */}
                <div className="absolute inset-0 border border-[#dfff4f] opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500 pointer-events-none" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-6 text-white">
              HOW IT <span className="text-[#dfff4f]">WORKS</span>
            </h2>
            <p className="text-gray-500 text-sm uppercase tracking-widest max-w-xl mx-auto">
              Three simple steps to never awkwardly ask for money again
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                step: "01",
                title: "Create a Group",
                desc: "Start a group for your trip, apartment, or dinner squad. Invite friends via link.",
                // Replace with your actual image path:
                // image: "/images/step-1-create-group.png"
                image: null,
              },
              {
                step: "02",
                title: "Add Expenses",
                desc: "Snap a receipt or manually add who paid and who owes. We handle the math.",
                image: null,
              },
              {
                step: "03",
                title: "Settle Up",
                desc: "See who owes what at a glance. Send a nudge or settle with one tap.",
                image: null,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center"
              >
                {/* Image Placeholder */}
                <div className="relative mx-auto mb-8 w-full max-w-[280px] aspect-[9/16] bg-[#131316] border border-white/10 rounded-3xl overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <span className="text-2xl">📱</span>
                      </div>
                      <span className="text-xs uppercase tracking-widest">Screenshot {item.step}</span>
                    </div>
                  )}
                  {/* Step number badge */}
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-[#dfff4f] text-black font-bold text-sm flex items-center justify-center">
                    {item.step}
                  </div>
                </div>

                <h3 className="font-display text-xl md:text-2xl font-bold mb-3 text-white">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 md:py-32 px-6 bg-[#0a0a0c]/50 relative z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-16 border-b border-white/10 pb-20">
            <div className="max-w-2xl">
              <h2 className="font-display text-5xl md:text-7xl font-bold mb-8 text-white leading-[0.9]">
                NO MORE EXCUSES. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#dfff4f] to-[#ff4f99]">MAGBABAYAD KAYO.</span>
              </h2>
              <p className="text-gray-500 text-lg font-mono">Finally collect what you're owed. We make sure they don't "forget".</p>
            </div>
            <div className="flex gap-8 md:gap-16">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-display text-4xl md:text-6xl font-bold mb-2 text-white"
                >
                  100%
                </motion.div>
                <div className="text-[10px] uppercase tracking-widest text-[#dfff4f]">Free Forever</div>
              </div>
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="font-display text-4xl md:text-6xl font-bold mb-2 text-white"
                >
                  &lt;1min
                </motion.div>
                <div className="text-[10px] uppercase tracking-widest text-[#ff4f99]">To Get Started</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#050507] border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="font-display text-2xl font-bold text-white hover:text-[#dfff4f] transition-colors">PayUp.</Link>
          <div className="flex gap-8 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
            <a href="#" className="hover:text-[#dfff4f] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#dfff4f] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#dfff4f] transition-colors">Twitter</a>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-gray-600">
            © 2024 PayUp Inc.
          </div>
        </div>
      </footer>
    </div>
  )
}
