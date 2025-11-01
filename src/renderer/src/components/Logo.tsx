interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-sm' },
    md: { icon: 40, text: 'text-base' },
    lg: { icon: 56, text: 'text-xl' }
  }

  const { icon: iconSize, text: textSize } = sizes[size]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo 图标 - 三点三角形排列 */}
      <div className="relative" style={{ width: iconSize, height: iconSize }}>
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 hover:scale-110"
        >
          <defs>
            {/* 渐变定义 */}
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            
            {/* 发光滤镜 */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 三个圆点组成的三角形 - 象征光标/指针 */}
          {/* 顶部点 */}
          <circle
            cx="20"
            cy="10"
            r="4"
            fill="url(#logoGradient)"
            filter="url(#glow)"
            className="animate-pulse"
            style={{ animationDelay: '0s', animationDuration: '3s' }}
          />
          
          {/* 左下点 */}
          <circle
            cx="12"
            cy="28"
            r="4"
            fill="url(#logoGradient)"
            filter="url(#glow)"
            className="animate-pulse"
            style={{ animationDelay: '1s', animationDuration: '3s' }}
          />
          
          {/* 右下点 */}
          <circle
            cx="28"
            cy="28"
            r="4"
            fill="url(#logoGradient)"
            filter="url(#glow)"
            className="animate-pulse"
            style={{ animationDelay: '2s', animationDuration: '3s' }}
          />
          
          {/* 连接线 - 形成三角形 */}
          <path
            d="M 20 10 L 12 28 L 28 28 Z"
            stroke="url(#logoGradient)"
            strokeWidth="1"
            fill="none"
            opacity="0.3"
            className="animate-pulse"
            style={{ animationDuration: '4s' }}
          />
        </svg>
      </div>

      {/* Logo 文字 */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`font-bold text-gradient-primary ${textSize}`}>
            Cursor
          </span>
          <span className={`font-medium text-gradient-primary opacity-80 ${textSize}`}>
            Tool
          </span>
        </div>
      )}
    </div>
  )
}

