// particlex-toc-fixed.js
(function() {
  'use strict';
  
  window.addEventListener('load', function() {
    console.log('Fixed Particlex TOC 初始化...');
    setTimeout(createFixedTOC, 800);
  });
  
  function createFixedTOC() {
    // 1. 查找文章内容容器
    const containers = [
      document.querySelector('.post-content'),
      document.querySelector('.content'),
      document.querySelector('article'),
      document.querySelector('.post'),
      document.querySelector('.post-body'),
      document.querySelector('.article-content'),
      document.querySelector('.entry-content'),
      document.querySelector('.blog-post'),
      document.querySelector('main')
    ].filter(Boolean);
    
    // 找到包含最多标题的容器
    let bestContainer = null;
    let maxHeadings = 0;
    
    containers.forEach(container => {
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const validHeadings = Array.from(headings).filter(h => 
        !h.textContent.includes('Loading') && 
        h.textContent.trim().length > 0 &&
        !h.classList.contains('nav-title')
      );
      
      if (validHeadings.length > maxHeadings) {
        maxHeadings = validHeadings.length;
        bestContainer = container;
      }
    });
    
    if (!bestContainer) {
      console.log('未找到最佳容器，使用 body');
      bestContainer = document.body;
    }
    
    // 2. 获取并过滤标题
    const allHeadings = bestContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headings = Array.from(allHeadings).filter(heading => {
      const text = heading.textContent.trim();
      // 过滤掉Loading标题和导航相关标题
      return (
        text.length > 0 &&
        !text.includes('Loading') &&
        !text.includes('导航') &&
        !text.includes('Menu') &&
        !heading.classList.contains('nav') &&
        !heading.closest('nav, header, footer, .nav, .header, .footer')
      );
    });
    
    if (headings.length < 2) {
      console.log('有效标题不足，跳过目录生成');
      return;
    }
    
    console.log('有效标题数量:', headings.length);
    
    // 3. 清理可能已存在的目录
    document.querySelectorAll('.enhanced-toc, #enhanced-particlex-toc, #fixed-particlex-toc, .fixed-toc').forEach(el => {
      el.remove();
    });
    
    // 4. 创建目录容器
    const tocContainer = document.createElement('div');
    tocContainer.id = 'fixed-particlex-toc';
    tocContainer.className = 'fixed-toc';
    
    // 目录头部
    const tocHeader = document.createElement('div');
    tocHeader.className = 'toc-header';
    tocHeader.innerHTML = `
      <div class="toc-header-left">
        <span class="toc-icon">📚</span>
        <span class="toc-title">文章目录</span>
        <span class="toc-count">(${headings.length})</span>
      </div>
      <div class="toc-header-right">
        <button class="toc-back-to-top" title="回到顶部">
          <svg class="back-to-top-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
        <button class="toc-toggle" title="折叠/展开">
          <svg class="toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>
    `;
    
    // 目录内容区域
    const tocContent = document.createElement('div');
    tocContent.className = 'toc-content';
    
    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';
    
    // 5. 生成目录项
    headings.forEach((heading, index) => {
      let id = heading.id;
      if (!id || id.includes('heading-0-')) {
        const text = heading.textContent
          .trim()
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        id = text || `section-${index + 1}`;
        heading.id = id;
      }
      
      const level = parseInt(heading.tagName.substring(1));
      const listItem = document.createElement('li');
      listItem.className = `toc-item toc-level-${Math.min(level, 6)}`;
      
      const link = document.createElement('a');
      link.href = '#' + id;
      link.textContent = heading.textContent.trim();
      
      link.addEventListener('click', function(e) {
        e.preventDefault();
        scrollToElement(id);
        history.replaceState(null, null, '#' + id);
      });
      
      listItem.appendChild(link);
      tocList.appendChild(listItem);
    });
    
    tocContent.appendChild(tocList);
    tocContainer.appendChild(tocHeader);
    tocContainer.appendChild(tocContent);
    
    // 6. 添加到页面
    document.body.appendChild(tocContainer);
    
    // 7. 折叠功能（修复版）
    const toggleBtn = tocContainer.querySelector('.toc-toggle');
    let isCollapsed = false;
    
    toggleBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      isCollapsed = !isCollapsed;
      
      if (isCollapsed) {
        // 折叠
        tocContainer.classList.add('collapsed');
        toggleBtn.querySelector('.toggle-icon').style.transform = 'rotate(180deg)';
      } else {
        // 展开
        tocContainer.classList.remove('collapsed');
        toggleBtn.querySelector('.toggle-icon').style.transform = 'rotate(0deg)';
      }
    });
    
    // 8. 回到顶部功能
    const backToTopBtn = tocContainer.querySelector('.toc-back-to-top');
    backToTopBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // 添加点击反馈
      this.classList.add('clicked');
      setTimeout(() => {
        this.classList.remove('clicked');
      }, 300);
      
      // 平滑滚动到顶部
      smoothScrollToTop();
    });
    
    // 9. 添加拖拽功能
    addDragFunctionality(tocContainer);
    
    // 10. 添加滚动监听
    addScrollListener(headings, tocContainer);
    
    console.log('修复版目录创建完成！');
  }
  
  // 平滑滚动到元素
  function scrollToElement(id) {
    const element = document.getElementById(id);
    if (!element) return;
    
    const headerOffset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
  
  // 平滑滚动到顶部
  function smoothScrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // 清除URL中的hash
    history.replaceState(null, null, ' ');
  }
  
  // 拖拽功能
  function addDragFunctionality(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    const header = element.querySelector('.toc-header');
    
    header.style.cursor = 'move';
    header.addEventListener('mousedown', startDrag);
    
    // 阻止按钮触发拖拽
    header.addEventListener('mousedown', function(e) {
      if (e.target.closest('button')) {
        e.stopPropagation();
        return false;
      }
    });
    
    function startDrag(e) {
      // 如果点击的是按钮，不启动拖拽
      if (e.target.closest('button')) return;
      
      isDragging = true;
      const rect = element.getBoundingClientRect();
      
      startLeft = rect.left;
      startTop = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      
      element.style.transition = 'none';
      element.classList.add('dragging');
      
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
      
      e.preventDefault();
    }
    
    function drag(e) {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;
      
      // 限制在视窗内
      const maxX = window.innerWidth - element.offsetWidth;
      const maxY = window.innerHeight - element.offsetHeight;
      
      newLeft = Math.max(10, Math.min(newLeft, maxX - 10));
      newTop = Math.max(10, Math.min(newTop, maxY - 10));
      
      element.style.left = newLeft + 'px';
      element.style.top = newTop + 'px';
      element.style.right = 'auto';
    }
    
    function stopDrag() {
      if (!isDragging) return;
      
      isDragging = false;
      element.style.transition = '';
      element.classList.remove('dragging');
      
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }
  
  // 滚动监听
  function addScrollListener(headings, tocContainer) {
    let ticking = false;
    
    function updateActiveTocItem() {
      const scrollPos = window.scrollY + 100;
      const tocLinks = tocContainer.querySelectorAll('.toc-item a');
      
      let currentHeading = null;
      for (let i = headings.length - 1; i >= 0; i--) {
        if (headings[i].offsetTop <= scrollPos) {
          currentHeading = headings[i];
          break;
        }
      }
      
      if (currentHeading) {
        tocLinks.forEach(link => {
          link.classList.remove('active');
        });
        
        const currentLink = tocContainer.querySelector(`.toc-item a[href="#${currentHeading.id}"]`);
        if (currentLink) {
          currentLink.classList.add('active');
        }
      }
    }
    
    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(function() {
          updateActiveTocItem();
          ticking = false;
        });
        ticking = true;
      }
    });
    
    updateActiveTocItem();
  }
})();