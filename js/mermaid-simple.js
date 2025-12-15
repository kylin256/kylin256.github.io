// 极简版 Mermaid 增强 - 避免页面卡死
(function() {
    'use strict';
    
    // 等待 Mermaid 加载完成
    function waitForMermaid(callback, maxAttempts = 30) {
        let attempts = 0;
        const interval = setInterval(() => {
            if (typeof mermaid !== 'undefined') {
                clearInterval(interval);
                console.log('Mermaid 已加载，开始初始化');
                setTimeout(callback, 100); // 延迟确保完全加载
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('Mermaid 加载超时');
            }
            attempts++;
        }, 200);
    }
    
    // 极简初始化
    function initSimpleMermaid() {
        try {
            // 1. 先初始化 Mermaid 基础配置
            mermaid.initialize({
                startOnLoad: false, // 重要：禁用自动加载
                theme: 'base',
                themeVariables: {
                    background: 'transparent',
                    lineColor: '#333'
                },
                securityLevel: 'loose'
            });
            
            // 2. 渲染所有图表
            const mermaidElements = document.querySelectorAll('.mermaid:not([data-processed])');
            console.log(`找到 ${mermaidElements.length} 个 Mermaid 图表`);
            
            // 分批渲染，避免阻塞
            batchRender(mermaidElements);
            
        } catch (error) {
            console.error('Mermaid 初始化失败:', error);
        }
    }
    
    // 分批渲染函数
    function batchRender(elements) {
        const batchSize = 3; // 每次渲染3个
        let index = 0;
        
        function renderNextBatch() {
            const batch = Array.from(elements).slice(index, index + batchSize);
            if (batch.length === 0) return;
            
            batch.forEach((element, i) => {
                setTimeout(() => {
                    try {
                        renderSingleChart(element, index + i);
                    } catch (err) {
                        console.error(`图表 ${index + i} 渲染失败:`, err);
                        showError(element, err);
                    }
                }, i * 100); // 每个图表间隔100ms
            });
            
            index += batchSize;
            if (index < elements.length) {
                // 使用 requestIdleCallback 避免阻塞主线程
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(renderNextBatch, { timeout: 1000 });
                } else {
                    setTimeout(renderNextBatch, 500);
                }
            }
        }
        
        renderNextBatch();
    }
    
    // 渲染单个图表
    function renderSingleChart(element, id) {
        const container = document.createElement('div');
        container.className = 'mermaid-simple-container';
        
        // 将图表包装起来
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'mermaid-simple-chart';
        
        // 替换原始元素
        const parent = element.parentNode;
        const originalContent = element.textContent;
        
        // 创建新的图表元素
        const newElement = document.createElement('div');
        newElement.className = 'mermaid';
        newElement.id = `mermaid-${id}`;
        newElement.textContent = originalContent;
        newElement.setAttribute('data-processed', 'true');
        
        // 添加到容器
        chartWrapper.appendChild(newElement);
        container.appendChild(chartWrapper);
        
        // 替换原始元素
        parent.replaceChild(container, element);
        
        // 异步渲染
        setTimeout(() => {
            try {
                const mermaidInstance = mermaid.mermaidAPI || mermaid;
                mermaidInstance.render(`mermaid-svg-${id}`, originalContent, (svgCode) => {
                    newElement.innerHTML = svgCode;
                    addSimpleControls(container, newElement, id);
                });
            } catch (error) {
                console.error(`图表 ${id} 渲染失败:`, error);
                newElement.innerHTML = `<div style="color:#666;padding:20px;border:1px dashed #ccc;border-radius:4px;">
                    <p style="margin:0;">图表加载失败</p>
                    <small>${error.message}</small>
                </div>`;
            }
        }, 50);
    }
    
    // 添加简单控制
    function addSimpleControls(container, element, id) {
        // 创建控制栏
        const controls = document.createElement('div');
        controls.className = 'mermaid-simple-controls';
        controls.innerHTML = `
            <button onclick="zoomChart('${id}', 'in')" title="放大">🔍+</button>
            <button onclick="zoomChart('${id}', 'out')" title="缩小">🔍-</button>
            <button onclick="resetChart('${id}')" title="重置">⟲</button>
            <button onclick="downloadChart('${id}')" title="下载">💾</button>
        `;
        
        container.appendChild(controls);
        
        // 添加全局函数
        if (!window.mermaidCharts) window.mermaidCharts = {};
        window.mermaidCharts[id] = {
            element: element,
            scale: 1,
            panX: 0,
            panY: 0
        };
    }
    
    // 显示错误
    function showError(element, error) {
        element.innerHTML = `
            <div style="
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 4px;
                padding: 15px;
                margin: 10px 0;
                color: #856404;
                font-size: 14px;
            ">
                <strong>⚠️ 图表渲染错误</strong><br>
                <small>${error.message}</small>
            </div>
        `;
    }
    
    // 定义全局函数
    window.zoomChart = function(id, direction) {
        const chart = window.mermaidCharts && window.mermaidCharts[id];
        if (!chart) return;
        
        if (direction === 'in') chart.scale = Math.min(chart.scale * 1.2, 3);
        if (direction === 'out') chart.scale = Math.max(chart.scale * 0.8, 0.5);
        
        chart.element.style.transform = `scale(${chart.scale})`;
    };
    
    window.resetChart = function(id) {
        const chart = window.mermaidCharts && window.mermaidCharts[id];
        if (!chart) return;
        
        chart.scale = 1;
        chart.panX = 0;
        chart.panY = 0;
        chart.element.style.transform = 'scale(1)';
    };
    
    window.downloadChart = function(id) {
        const chart = window.mermaidCharts && window.mermaidCharts[id];
        if (!chart) return;
        
        const svg = chart.element.querySelector('svg');
        if (!svg) return;
        
        try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mermaid-${id}-${Date.now()}.svg`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('下载失败:', error);
        }
    };
    
    // 监听滚动，懒加载图表
    let observer;
    if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    if (!element.hasAttribute('data-processed')) {
                        renderSingleChart(element, Date.now());
                    }
                    observer.unobserve(element);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });
    }
    
    // 等待 Mermaid 并初始化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM 已加载，开始等待 Mermaid');
        waitForMermaid(initSimpleMermaid);
    });
    
})();