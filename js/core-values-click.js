// core-values-click.js
(function() {
    // 社会主义核心价值观 - 固定顺序
    const coreValues = [
        "富强", "民主", "文明", "和谐",
        "自由", "平等", "公正", "法治", 
        "爱国", "敬业", "诚信", "友善"
    ];
    
    // 颜色数组 - 红色主题
    const colors = [
        '#FF0000', // 红色
        '#E60000', // 暗红
        '#CC0000', // 深红
        '#B30000', // 红棕
        '#990000', // 褐红
        '#800000'  // 栗色
    ];
    
    // 当前显示的粒子数量和顺序索引
    let particleCount = 0;
    let valueIndex = 0;
    const maxParticles = 12;
    
    // 鼠标点击事件
    document.addEventListener('click', function(e) {
        // 限制同时显示的粒子数量
        if (particleCount >= maxParticles) return;
        
        // 按顺序获取价值观，循环使用
        const value = coreValues[valueIndex];
        valueIndex = (valueIndex + 1) % coreValues.length;
        
        // 颜色按顺序或随机，这里按顺序
        const colorIndex = valueIndex % colors.length;
        const color = colors[colorIndex];
        
        particleCount++;
        
        // 创建元素
        const element = document.createElement('div');
        element.className = 'core-value-particle';
        element.textContent = value;
        
        // 生成随机偏移，避免文字完全重叠
        const offsetX = (Math.random() - 0.5) * 25;
        const offsetY = (Math.random() - 0.5) * 25;
        
        // 样式设置 - 移除背景或使用极低透明度
        element.style.cssText = `
            position: fixed;
            left: ${e.clientX + offsetX}px;
            top: ${e.clientY + offsetY}px;
            color: ${color};
            font-size: 22px;
            font-weight: 900;
            font-family: "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif;
            pointer-events: none;
            z-index: 999999;
            opacity: 1;
            transform: translate(-50%, -50%);
            user-select: none;
            text-shadow: 
                2px 2px 0 #FFFFFF,
                2px -2px 0 #FFFFFF,
                -2px 2px 0 #FFFFFF,
                -2px -2px 0 #FFFFFF,
                0 2px 0 #FFFFFF,
                0 -2px 0 #FFFFFF,
                2px 0 0 #FFFFFF,
                -2px 0 0 #FFFFFF,
                0 0 15px rgba(255, 255, 255, 0.9),
                0 0 20px rgba(255, 0, 0, 0.5);
            white-space: nowrap;
            text-align: center;
            animation: coreValueFloat 2.5s ease-out forwards;
            will-change: transform, opacity;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            line-height: 1;
            filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.8));
        `;
        
        document.body.appendChild(element);
        
        
        // 移除元素（2.5秒后）
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                particleCount--;
            }
        }, 2500);
    });
    
    // 防止在输入框等元素上触发
    document.addEventListener('DOMContentLoaded', function() {
        const inputs = ['input', 'textarea', 'select', 'button', 'a'];
        inputs.forEach(tagName => {
            document.querySelectorAll(tagName).forEach(el => {
                el.addEventListener('click', function(e) {
                    e.stopPropagation();
                }, true);
            });
        });
    });
    
    // 移动设备适配
    if ('ontouchstart' in window) {
        let touchTimer;
        document.addEventListener('touchstart', function(e) {
            clearTimeout(touchTimer);
            const touch = e.touches[0];
            touchTimer = setTimeout(() => {
                const event = new MouseEvent('click', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true
                });
                document.dispatchEvent(event);
            }, 50);
        }, { passive: true });
        
        document.addEventListener('touchend', function() {
            clearTimeout(touchTimer);
        }, { passive: true });
    }
})();