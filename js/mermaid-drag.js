// Mermaid 图表拖拽增强 - 轻量级，不影响加载
(function() {
    'use strict';
    
    // 等待 Mermaid 完全加载
    let mermaidCheckInterval;
    let checkCount = 0;
    
    function waitForMermaidAndAddDrag() {
        if (typeof mermaid !== 'undefined') {
            clearInterval(mermaidCheckInterval);
            console.log('Mermaid 已加载，开始添加拖拽功能');
            setTimeout(initDragEnhancement, 300);
        } else if (checkCount > 50) { // 10秒超时
            clearInterval(mermaidCheckInterval);
            console.warn('等待 Mermaid 超时，跳过拖拽功能');
        }
        checkCount++;
    }
    
    // 初始化拖拽功能
    function initDragEnhancement() {
        try {
            // 为现有图表添加拖拽
            addDragToExistingCharts();
            
            // 监听新图表
            observeNewCharts();
            
            console.log('Mermaid 拖拽功能已启用');
        } catch (error) {
            console.error('拖拽功能初始化失败:', error);
        }
    }
    
    // 为现有图表添加拖拽
    function addDragToExistingCharts() {
        // const containers = document.querySelectorAll('.mermaid-simple-container, .mermaid-container, .mermaid');
        // bug导致生成两次，删了删了
        const containers = document.querySelectorAll('.mermaid');

        containers.forEach((container, index) => {
            // 确保每个容器只处理一次
            if (container.classList.contains('drag-enabled')) return;
            
            // 找到实际的 SVG 元素
            let svgElement = container.querySelector('svg');
            if (!svgElement) {
                // 如果是直接包含 mermaid 的 div，等待 SVG 渲染
                if (container.classList.contains('mermaid') && !container.querySelector('svg')) {
                    setTimeout(() => addDragToChart(container, index), 500);
                    return;
                }
                svgElement = container;
            }
            
            addDragToChart(container, index);
        });
    }
    
    // 为单个图表添加拖拽
    function addDragToChart(container, index) {
        // 确保每个图表只处理一次
        if (container.classList.contains('drag-enabled')) {
                return;
            }
        try {
            // 确保有 SVG 元素
            let svgElement = container.querySelector('svg');
            if (!svgElement && container.tagName === 'svg') {
                svgElement = container;
            }
            
            if (!svgElement) {
                console.log(`图表 ${index} 没有 SVG 元素，跳过拖拽`);
                return;
            }
            
            // 创建拖拽包装器
            const wrapper = createDragWrapper(svgElement, container, index);
            
            // 替换或包装 SVG
            if (svgElement.parentNode) {
                svgElement.parentNode.insertBefore(wrapper, svgElement);
                wrapper.appendChild(svgElement);
            }
            
            // 标记为已启用拖拽
            container.classList.add('drag-enabled');
            
            // 添加拖拽提示
            addDragHint(container);
            
        } catch (error) {
            console.error(`为图表 ${index} 添加拖拽失败:`, error);
        }
    }
    
    // 创建拖拽包装器
    function createDragWrapper(svgElement, container, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-drag-wrapper';
        wrapper.id = `mermaid-drag-${index}`;
        
        // 设置包装器样式
        wrapper.style.cssText = `
            position: relative;
            display: inline-block;
            cursor: grab;
            user-select: none;
            overflow: visible;
            max-width: 100%;
        `;
        
        // 存储拖拽状态
        let isDragging = false;
        let startX, startY;
        let translateX = 0, translateY = 0;
        let scale = 1;
        
        // 鼠标按下事件 - 开始拖拽
        wrapper.addEventListener('mousedown', function(e) {
            // 只响应左键点击
            if (e.button !== 0) return;
            
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            wrapper.style.cursor = 'grabbing';
            
            // 阻止文本选择和默认行为
            e.preventDefault();
            e.stopPropagation();
            
            // 添加拖拽中样式
            wrapper.classList.add('dragging');
            
            // 鼠标移动事件 - 拖拽中
            const handleMouseMove = (e) => {
                if (!isDragging) return;
                
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                
                // 应用变换
                applyTransform(wrapper, translateX, translateY, scale);
            };
            
            // 鼠标松开事件 - 结束拖拽
            const handleMouseUp = () => {
                isDragging = false;
                wrapper.style.cursor = 'grab';
                wrapper.classList.remove('dragging');
                
                // 移除事件监听器
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                // 保存位置到本地存储
                savePosition(container.id || index, { translateX, translateY, scale });
            };
            
            // 添加到 document 以便在窗口外也能拖拽
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        // 鼠标移入移出样式
        wrapper.addEventListener('mouseenter', function() {
            if (!isDragging) {
                wrapper.style.cursor = 'grab';
            }
        });
        
        wrapper.addEventListener('mouseleave', function() {
            if (!isDragging) {
                wrapper.style.cursor = 'default';
            }
        });
        
        // 触摸屏支持
        wrapper.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX - translateX;
            startY = touch.clientY - translateY;
            wrapper.style.cursor = 'grabbing';
            
            e.preventDefault();
            e.stopPropagation();
            wrapper.classList.add('dragging');
            
            const handleTouchMove = (e) => {
                if (!isDragging || e.touches.length !== 1) return;
                
                const touch = e.touches[0];
                translateX = touch.clientX - startX;
                translateY = touch.clientY - startY;
                
                applyTransform(wrapper, translateX, translateY, scale);
            };
            
            const handleTouchEnd = () => {
                isDragging = false;
                wrapper.style.cursor = 'grab';
                wrapper.classList.remove('dragging');
                
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                
                savePosition(container.id || index, { translateX, translateY, scale });
            };
            
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd);
        });
        
        // 双击重置位置
        wrapper.addEventListener('dblclick', function() {
            translateX = 0;
            translateY = 0;
            scale = 1;
            applyTransform(wrapper, 0, 0, 1);
            savePosition(container.id || index, { translateX: 0, translateY: 0, scale: 1 });
        });
        
        // 从本地存储加载保存的位置
        loadSavedPosition(container.id || index).then(saved => {
            if (saved) {
                translateX = saved.translateX || 0;
                translateY = saved.translateY || 0;
                scale = saved.scale || 1;
                applyTransform(wrapper, translateX, translateY, scale);
            }
        });
        
        return wrapper;
    }
    
    // 应用变换
    function applyTransform(element, x, y, s) {
        element.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
        element.style.transformOrigin = 'center center';
    }
    
    // 保存位置到本地存储
    function savePosition(chartId, position) {
        try {
            const key = `mermaid-drag-${chartId}`;
            localStorage.setItem(key, JSON.stringify(position));
        } catch (error) {
            // 本地存储可能已满或无权限
            console.warn('无法保存图表位置:', error);
        }
    }
    
    // 从本地存储加载位置
    function loadSavedPosition(chartId) {
        return new Promise((resolve) => {
            try {
                const key = `mermaid-drag-${chartId}`;
                const saved = localStorage.getItem(key);
                if (saved) {
                    resolve(JSON.parse(saved));
                } else {
                    resolve(null);
                }
            } catch (error) {
                console.warn('无法加载图表位置:', error);
                resolve(null);
            }
        });
    }
    
    // 添加拖拽提示
    function addDragHint(container) {
        // 检查是否已存在提示
        if (container.querySelector('.drag-hint')) {
            return; // 如果已经存在，直接返回，避免重复添加
        }
        
        const hint = document.createElement('div');
        hint.className = 'drag-hint';
        hint.innerHTML = '🖱️ 按住拖拽 | 双击重置';
        hint.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        `;
        
        container.appendChild(hint);

        // 用于管理自动隐藏的定时器，避免未声明导致的 ReferenceError
        let hideTimeout = null;

        hint.classList.add('hidden'); // 初始隐藏
        function showHint() {
          hint.classList.remove('hidden');
          hint.style.opacity = '0.8';
          clearTimeout(hideTimeout);
          hideTimeout = setTimeout(() => hint.classList.add('hidden'), 3000);
        }
        container.addEventListener('mouseenter', showHint);
        container.addEventListener('mouseleave', () => { hideTimeout = setTimeout(() => hint.classList.add('hidden'), 300); });
    }
    
    // 监听新图表
    function observeNewCharts() {
        if (typeof MutationObserver === 'undefined') return;
        
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    const newCharts = Array.from(mutation.addedNodes).flatMap(node => {
                        if (node.nodeType === 1) {
                            // 检查新节点中的图表
                            const charts = node.querySelectorAll ? 
                                Array.from(node.querySelectorAll('.mermaid, .mermaid-container, .mermaid-simple-container')) : [];
                            if (node.classList && 
                                (node.classList.contains('mermaid') || 
                                 node.classList.contains('mermaid-container') || 
                                 node.classList.contains('mermaid-simple-container'))) {
                                charts.push(node);
                            }
                            return charts;
                        }
                        return [];
                    });
                    
                    if (newCharts.length > 0) {
                        setTimeout(() => {
                            newCharts.forEach((chart, i) => {
                                if (!chart.classList.contains('drag-enabled')) {
                                    setTimeout(() => addDragToChart(chart, Date.now() + i), 100);
                                }
                            });
                        }, 500); // 等待图表渲染
                    }
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM 加载完成，等待 Mermaid...');
        
        // 如果 Mermaid 已经加载
        if (typeof mermaid !== 'undefined') {
            setTimeout(initDragEnhancement, 500);
        } else {
            // 轮询检查 Mermaid 是否加载
            mermaidCheckInterval = setInterval(waitForMermaidAndAddDrag, 200);
        }
    });
    
})();