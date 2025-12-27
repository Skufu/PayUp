import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface NetworkBackgroundProps {
    className?: string
}

// Generate initial nodes outside of component to avoid re-creation
const generateInitialNodes = () =>
    Array.from({ length: 12 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
    }))

export function NetworkBackground({ className = '' }: NetworkBackgroundProps) {
    // Use lazy initializer to generate nodes once on mount
    const [nodes] = useState<{ x: number; y: number }[]>(generateInitialNodes)
    const [transactions, setTransactions] = useState<{ id: number; start: number; end: number }[]>([])

    useEffect(() => {
        // Simulate transactions less frequently for better performance
        const interval = setInterval(() => {
            if (nodes.length < 2) return
            const start = Math.floor(Math.random() * nodes.length)
            let end = Math.floor(Math.random() * nodes.length)
            while (end === start) end = Math.floor(Math.random() * nodes.length)

            const id = Date.now()
            setTransactions((prev) => [...prev, { id, start, end }])

            // Cleanup old transactions
            setTimeout(() => {
                setTransactions((prev) => prev.filter((t) => t.id !== id))
            }, 2000)
        }, 1000) // Reduced from 500ms to 1000ms

        return () => clearInterval(interval)
    }, [nodes.length])

    return (
        <div className={`fixed inset-0 z-0 overflow-hidden pointer-events-none ${className}`}>
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
