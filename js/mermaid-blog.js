(function() {
    'use strict';
    
    // 默认配置
    const DEFAULT_CONFIG = {
        // 容器设置
        minHeight: '200px',
        
        // 初始缩放
        initialZoom: 1,
        
        // 缩放控制
        zoomEnabled: true,
        minZoom: 0.3,
        maxZoom: 3,
        zoomScaleSensitivity: 0.1,
        
        // 拖拽控制
        panEnabled: true,
        panSensitivity: 0.8, // 适中的拖拽速度
        
        // 双击复位
        doubleClickEnabled: true,
        
        // 控制按钮
        controlsEnabled: true,
        showDownloadBtn: true,
        showResetBtn: true,
        
        // 视觉效果
        showZoomInfo: true,
        showDoubleClickHint: true,
        animationDuration: 300,
        
        // 调试模式
        debug: false
    };
    
    // 存储所有实例
    const instances = new Map();
    
    // Mermaid交互类
    class MermaidInteractive {
        constructor(mermaidElement, config = {}) {
            this.element = mermaidElement;
            this.config = { ...DEFAULT_CONFIG, ...config };
            this.svg = null;
            this.container = null; // 透明容器
            
            this.state = {
                scale: this.config.initialZoom,
                translateX: 0,
                translateY: 0,
                isDragging: false,
                startX: 0,
                startY: 0,
                startTranslateX: 0,
                startTranslateY: 0
            };
            
            this.log('开始初始化Mermaid交互');
            this.init();
        }
        
        // 初始化
        init() {
            // 标记为已初始化
            this.element.setAttribute('data-mermaid-interactive', 'true');
            
            // 设置元素样式
            this.setupElement();
            
            // 查找SVG元素
            this.findSVG();
            
            if (!this.svg) {
                this.log('未找到SVG元素，尝试延迟查找');
                this.waitForSVG();
                return;
            }
            
            // 创建透明容器并设置SVG
            this.setupContainerAndSVG();
            
            // 绑定事件
            this.bindEvents();
            
            // 添加控制元素
            this.addControls();
            
            // 应用初始变换
            this.updateTransform();
            
            this.log('Mermaid交互初始化完成');
        }
        
        // 设置元素样式
        setupElement() {
            // 确保有正确的样式
            this.element.style.position = 'relative';
            this.element.style.overflow = 'hidden';
            
            // 设置最小高度
            if (!this.element.style.minHeight) {
                this.element.style.minHeight = this.config.minHeight;
            }
            
            this.log('元素样式已设置');
        }
        
        // 查找SVG元素
        findSVG() {
            this.svg = this.element.querySelector('svg');
            
            if (this.svg) {
                this.log(`找到SVG元素: ${this.svg.id || '无ID'}`);
            }
        }
        
        // 等待SVG元素
        waitForSVG() {
            const maxAttempts = 10;
            let attempts = 0;
            
            const checkSVG = () => {
                this.findSVG();
                
                if (this.svg) {
                    this.setupContainerAndSVG();
                    this.bindEvents();
                    this.addControls();
                    this.updateTransform();
                    this.log('SVG元素延迟加载成功');
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkSVG, 200);
                } else {
                    this.log('无法找到SVG元素');
                }
            };
            
            setTimeout(checkSVG, 200);
        }
        
        // 创建透明容器并设置SVG
        setupContainerAndSVG() {
            if (!this.svg) return;
            
            // 创建透明容器
            this.container = document.createElement('div');
            this.container.className = 'mermaid-interactive-container';
            
            // 将SVG移动到透明容器中
            this.element.appendChild(this.container);
            this.container.appendChild(this.svg);
            
            // 保存原始viewBox
            this.saveOriginalDimensions();
            
            // 设置SVG样式
            this.svg.style.maxWidth = '100%';
            this.svg.style.maxHeight = '100%';
            this.svg.style.width = 'auto';
            this.svg.style.height = 'auto';
            this.svg.style.cursor = 'grab';
            
            // 根据SVG尺寸调整容器高度
            this.adjustContainerHeight();
            
            this.log('透明容器和SVG已设置');
        }
        
        // 保存原始尺寸
        saveOriginalDimensions() {
            // 获取viewBox
            const viewBox = this.svg.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(' ');
                this.originalViewBox = {
                    width: parseFloat(parts[2]) || 800,
                    height: parseFloat(parts[3]) || 600
                };
                this.log(`原始viewBox: ${this.originalViewBox.width}x${this.originalViewBox.height}`);
            } else {
                // 如果没有viewBox，使用当前尺寸
                this.originalViewBox = {
                    width: this.svg.clientWidth || 800,
                    height: this.svg.clientHeight || 600
                };
                this.log(`使用客户端尺寸: ${this.originalViewBox.width}x${this.originalViewBox.height}`);
            }
        }
        
        // 调整容器高度
        adjustContainerHeight() {
            if (!this.originalViewBox) return;
            
            const elementWidth = this.element.clientWidth;
            if (elementWidth > 0) {
                // 根据宽高比计算合适的高度
                const aspectRatio = this.originalViewBox.height / this.originalViewBox.width;
                let calculatedHeight = elementWidth * aspectRatio;
                
                // 设置最小和最大限制
                calculatedHeight = Math.max(calculatedHeight, 180);
                calculatedHeight = Math.min(calculatedHeight, 500);
                
                this.element.style.height = `${calculatedHeight}px`;
                this.log(`调整容器高度: ${calculatedHeight}px (宽高比: ${aspectRatio.toFixed(2)})`);
            }
        }
        
        // 绑定事件
        bindEvents() {
            if (!this.svg) return;
            
            // 拖拽事件
            if (this.config.panEnabled) {
                this.svg.addEventListener('mousedown', this.onMouseDown.bind(this));
            }
            
            // 缩放事件
            if (this.config.zoomEnabled) {
                this.svg.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
            }
            
            // 双击事件
            if (this.config.doubleClickEnabled) {
                this.svg.addEventListener('dblclick', this.reset.bind(this));
            }
            
            // 全局事件
            document.addEventListener('mousemove', this.onMouseMove.bind(this));
            document.addEventListener('mouseup', this.onMouseUp.bind(this));
            
            // 窗口大小变化
            window.addEventListener('resize', this.onResize.bind(this));
            
            // 触摸事件支持
            this.svg.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            document.addEventListener('touchend', this.onTouchEnd.bind(this));
        }
        
        // 鼠标按下事件
        onMouseDown(e) {
            if (e.button !== 0) return;
            
            e.preventDefault();
            this.state.isDragging = true;
            this.state.startX = e.clientX;
            this.state.startY = e.clientY;
            this.state.startTranslateX = this.state.translateX;
            this.state.startTranslateY = this.state.translateY;
            
            this.svg.style.cursor = 'grabbing';
            this.svg.style.transition = 'none';
            
            this.log('开始拖拽');
        }
        
        // 鼠标移动事件
        onMouseMove(e) {
            if (!this.state.isDragging || !this.svg) return;
            
            e.preventDefault();
            
            // 使用适中的拖拽速度
            const deltaX = (e.clientX - this.state.startX) * this.config.panSensitivity;
            const deltaY = (e.clientY - this.state.startY) * this.config.panSensitivity;
            
            this.state.translateX = this.state.startTranslateX + deltaX;
            this.state.translateY = this.state.startTranslateY + deltaY;
            
            this.updateTransform();
        }
        
        // 鼠标释放事件
        onMouseUp() {
            if (!this.state.isDragging) return;
            
            this.state.isDragging = false;
            this.svg.style.cursor = 'grab';
            
            this.svg.style.transition = `transform ${this.config.animationDuration}ms ease`;
            
            this.log('结束拖拽');
        }
        
        // 触摸开始事件
        onTouchStart(e) {
            if (e.touches.length !== 1) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            
            this.state.isDragging = true;
            this.state.startX = touch.clientX;
            this.state.startY = touch.clientY;
            this.state.startTranslateX = this.state.translateX;
            this.state.startTranslateY = this.state.translateY;
            
            if (this.svg) {
                this.svg.style.transition = 'none';
            }
        }
        
        // 触摸移动事件
        onTouchMove(e) {
            if (!this.state.isDragging || e.touches.length !== 1 || !this.svg) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            
            const deltaX = (touch.clientX - this.state.startX) * this.config.panSensitivity;
            const deltaY = (touch.clientY - this.state.startY) * this.config.panSensitivity;
            
            this.state.translateX = this.state.startTranslateX + deltaX;
            this.state.translateY = this.state.startTranslateY + deltaY;
            
            this.updateTransform();
        }
        
        // 触摸结束事件
        onTouchEnd() {
            this.state.isDragging = false;
            
            if (this.svg) {
                this.svg.style.transition = `transform ${this.config.animationDuration}ms ease`;
            }
        }
        
        // 滚轮缩放事件
        onWheel(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!this.svg) return;
            
            const delta = e.deltaY > 0 ? -1 : 1;
            const zoomFactor = 1 + (delta * this.config.zoomScaleSensitivity);
            const newScale = this.state.scale * zoomFactor;
            
            // 限制缩放范围
            if (newScale >= this.config.minZoom && newScale <= this.config.maxZoom) {
                // 计算相对于鼠标位置的缩放
                const rect = this.container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;
                
                // 计算新的平移值
                const scaleRatio = newScale / this.state.scale;
                this.state.translateX = mouseX - (mouseX - this.state.translateX) * scaleRatio;
                this.state.translateY = mouseY - (mouseY - this.state.translateY) * scaleRatio;
                this.state.scale = newScale;
                
                this.updateTransform();
                this.updateZoomInfo();
                
                this.log(`缩放: ${Math.round(this.state.scale * 100)}%`);
            }
        }
        
        // 窗口大小变化事件
        onResize = () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.adjustContainerHeight();
                this.updateTransform();
            }, 200);
        };
        
        // 更新变换
        updateTransform() {
            if (!this.svg) return;
            
            const transform = `translate(${this.state.translateX}px, ${this.state.translateY}px) scale(${this.state.scale})`;
            this.svg.style.transform = transform;
        }
        
        // 添加控制元素
        addControls() {
            if (!this.container) return;
            
            // 先清除可能已存在的控制元素
            this.removeExistingControls();
            
            // 缩放信息 - 左上角
            if (this.config.showZoomInfo) {
                const zoomInfo = document.createElement('div');
                zoomInfo.className = 'mermaid-zoom-info';
                zoomInfo.textContent = `${Math.round(this.state.scale * 100)}%`;
                this.zoomInfoElement = zoomInfo;
                this.container.appendChild(zoomInfo);
            }
            
            // 控制按钮容器 - 右上角
            if (this.config.controlsEnabled) {
                const controls = document.createElement('div');
                controls.className = 'mermaid-controls';
                
                // 下载按钮
                if (this.config.showDownloadBtn) {
                    const downloadBtn = document.createElement('div');
                    downloadBtn.className = 'mermaid-btn download';
                    downloadBtn.title = '下载SVG';
                    downloadBtn.addEventListener('click', () => this.download());
                    controls.appendChild(downloadBtn);
                }
                
                // 复位按钮
                if (this.config.showResetBtn) {
                    const resetBtn = document.createElement('div');
                    resetBtn.className = 'mermaid-btn reset';
                    resetBtn.title = '重置视图';
                    resetBtn.addEventListener('click', () => this.reset());
                    controls.appendChild(resetBtn);
                }
                
                this.container.appendChild(controls);
            }
            
            // 双击提示 - 右上角（在按钮左边）
            if (this.config.showDoubleClickHint) {
                const hint = document.createElement('div');
                hint.className = 'mermaid-double-click-hint';
                hint.textContent = '双击复位';
                this.container.appendChild(hint);
            }
        }
        
        // 移除已存在的控制元素
        removeExistingControls() {
            if (!this.container) return;
            
            const selectors = ['.mermaid-controls', '.mermaid-zoom-info', '.mermaid-double-click-hint'];
            
            selectors.forEach(selector => {
                const element = this.container.querySelector(selector);
                if (element) {
                    element.remove();
                }
            });
        }
        
        // 更新缩放信息
        updateZoomInfo() {
            if (this.zoomInfoElement) {
                this.zoomInfoElement.textContent = `${Math.round(this.state.scale * 100)}%`;
            }
        }
        
        // 重置视图
        reset() {
            if (this.svg) {
                this.svg.style.transition = `transform ${this.config.animationDuration}ms ease`;
            }
            
            this.state.scale = this.config.initialZoom;
            this.state.translateX = 0;
            this.state.translateY = 0;
            this.state.isDragging = false;
            
            this.updateTransform();
            this.updateZoomInfo();
            
            // 移除过渡
            setTimeout(() => {
                if (this.svg) {
                    this.svg.style.transition = '';
                }
            }, this.config.animationDuration);
            
            this.log('视图已重置');
        }
        
        // 下载SVG
        download() {
            try {
                if (!this.svg) {
                    alert('SVG元素不可用');
                    return;
                }
                
                // 克隆SVG元素
                const svgClone = this.svg.cloneNode(true);
                
                // 移除变换样式
                svgClone.style.transform = '';
                svgClone.style.transformOrigin = '';
                
                // 使用原始尺寸
                if (this.originalViewBox) {
                    svgClone.setAttribute('width', this.originalViewBox.width);
                    svgClone.setAttribute('height', this.originalViewBox.height);
                } else {
                    svgClone.setAttribute('width', 800);
                    svgClone.setAttribute('height', 600);
                }
                
                // 确保有viewBox
                if (!svgClone.hasAttribute('viewBox') && this.originalViewBox) {
                    svgClone.setAttribute('viewBox', `0 0 ${this.originalViewBox.width} ${this.originalViewBox.height}`);
                }
                
                // 序列化SVG
                const serializer = new XMLSerializer();
                let source = serializer.serializeToString(svgClone);
                
                // 添加XML声明
                if (!source.includes('<?xml')) {
                    source = '<?xml version="1.0" encoding="UTF-8"?>\n' + source;
                }
                
                // 创建下载链接
                const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `mermaid-diagram-${Date.now()}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                this.log('SVG下载成功');
            } catch (error) {
                console.error('下载SVG时出错:', error);
                alert('下载失败: ' + error.message);
            }
        }
        
        // 日志记录
        log(message) {
            if (this.config.debug) {
                console.log(`[MermaidInteractive] ${message}`);
            }
        }
        
        // 销毁
        destroy() {
            // 移除事件监听器
            if (this.svg) {
                this.svg.removeEventListener('mousedown', this.onMouseDown);
                this.svg.removeEventListener('wheel', this.onWheel);
                this.svg.removeEventListener('dblclick', this.reset);
                this.svg.removeEventListener('touchstart', this.onTouchStart);
            }
            
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('mouseup', this.onMouseUp);
            document.removeEventListener('touchmove', this.onTouchMove);
            document.removeEventListener('touchend', this.onTouchEnd);
            window.removeEventListener('resize', this.onResize);
            
            // 移除控制元素
            this.removeExistingControls();
            
            // 移除透明容器
            if (this.container) {
                // 将SVG移回原位
                if (this.svg && this.container.contains(this.svg)) {
                    this.element.appendChild(this.svg);
                }
                this.container.remove();
            }
            
            // 移除transform样式
            if (this.svg) {
                this.svg.style.transform = '';
                this.svg.style.transformOrigin = '';
                this.svg.style.transition = '';
                this.svg.style.cursor = '';
            }
            
            // 移除数据属性
            this.element.removeAttribute('data-mermaid-interactive');
            
            // 移除实例引用
            instances.delete(this.element);
            
            this.log('实例已销毁');
        }
    }
    
    // 初始化所有Mermaid图表
    function initMermaidInteractive(userConfig = {}) {
        console.log('初始化Mermaid交互功能');
        
        // 合并配置
        const config = { ...DEFAULT_CONFIG, ...userConfig };
        
        // 查找所有Mermaid元素
        const mermaidElements = document.querySelectorAll('.mermaid');
        
        if (mermaidElements.length === 0) {
            console.log('未找到.mermaid元素');
            // 监听动态添加的元素
            observeNewMermaidElements(config);
            return;
        }
        
        console.log(`找到 ${mermaidElements.length} 个Mermaid图表`);
        
        // 初始化每个Mermaid元素
        mermaidElements.forEach((element, index) => {
            // 跳过已初始化的元素
            if (element.hasAttribute('data-mermaid-interactive')) {
                return;
            }
            
            console.log(`初始化图表 ${index + 1}`);
            
            // 延迟初始化，确保SVG已渲染
            setTimeout(() => {
                try {
                    const instance = new MermaidInteractive(element, config);
                    instances.set(element, instance);
                } catch (error) {
                    console.error(`初始化图表 ${index + 1} 失败:`, error);
                }
            }, 100);
        });
    }
    
    // 监听新添加的Mermaid元素
    function observeNewMermaidElements(config) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            // 检查节点本身是否是.mermaid
                            if (node.classList && node.classList.contains('mermaid')) {
                                console.log('检测到动态添加的Mermaid图表');
                                setTimeout(() => {
                                    if (!node.hasAttribute('data-mermaid-interactive')) {
                                        const instance = new MermaidInteractive(node, config);
                                        instances.set(node, instance);
                                    }
                                }, 200);
                            }
                            
                            // 检查节点内部是否有.mermaid
                            const mermaidElements = node.querySelectorAll && node.querySelectorAll('.mermaid');
                            if (mermaidElements && mermaidElements.length > 0) {
                                console.log(`在新增节点中发现 ${mermaidElements.length} 个Mermaid图表`);
                                setTimeout(() => initMermaidInteractive(config), 200);
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        window.mermaidObserver = observer;
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // 给Mermaid足够的时间渲染
            setTimeout(() => {
                initMermaidInteractive();
            }, 800);
        });
    } else {
        setTimeout(() => {
            initMermaidInteractive();
        }, 800);
    }
    
    // 全局API
    window.MermaidInteractive = {
        // 初始化函数
        init: (config) => {
            initMermaidInteractive(config);
        },
        
        // 重新初始化
        reinit: () => {
            // 销毁所有实例
            instances.forEach((instance, element) => {
                instance.destroy();
            });
            instances.clear();
            
            // 重新初始化
            setTimeout(() => initMermaidInteractive(), 300);
        },
        
        // 获取所有实例
        getInstances: () => instances,
        
        // 根据元素获取实例
        getInstance: (element) => instances.get(element),
        
        // 默认配置
        config: DEFAULT_CONFIG
    };
    
    console.log('Mermaid交互模块已加载');
})();