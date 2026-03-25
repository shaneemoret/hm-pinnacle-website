(function() {
  var root = document.documentElement;
  root.classList.add('lenis', 'lenis-smooth');

  function initLenis() {
    if (!window.Lenis) return;
    var lenis = new window.Lenis({
      duration: 1.15,
      smoothWheel: true,
      smoothTouch: false,
      lerp: 0.08
    });
    function raf(time) {
      lenis.raf(time);
      window.requestAnimationFrame(raf);
    }
    window.requestAnimationFrame(raf);
  }

  function loadLenis() {
    if (window.Lenis) {
      initLenis();
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/@studio-freight/lenis@1.0.42/bundled/lenis.min.js';
    script.async = true;
    script.onload = initLenis;
    script.onerror = function() {
      root.classList.remove('lenis', 'lenis-smooth');
    };
    document.head.appendChild(script);
  }

  function getTopicContext() {
    var title = (document.querySelector('.hero h1') || {}).textContent || '';
    var lower = title.toLowerCase();

    if (lower.indexOf('get out of the office') > -1 || lower.indexOf('floor') > -1) {
      return {
        mode: 'floor',
        heroBadges: ['FLOOR', 'SPAN', 'THROUGHPUT'],
        sceneLabels: ['Observe', 'Diagnose', 'Align', 'Stabilize'],
        sceneCaption: 'Operational Signal Map'
      };
    }

    if (lower.indexOf('growth lever') > -1 || lower.indexOf('people systems') > -1) {
      return {
        mode: 'growth',
        heroBadges: ['SYSTEMS', 'LEADERS', 'RETENTION'],
        sceneLabels: ['Hire', 'Onboard', 'Lead', 'Retain'],
        sceneCaption: 'People Ops Scaling Blueprint'
      };
    }

    if (lower.indexOf('ghosting') > -1 || lower.indexOf('culture and trust') > -1) {
      return {
        mode: 'trust',
        heroBadges: ['TRUST', 'CLARITY', 'CULTURE'],
        sceneLabels: ['Reach Out', 'Respond', 'Decide', 'Close'],
        sceneCaption: 'Candidate Trust Flow'
      };
    }

    return {
      mode: 'default',
      heroBadges: ['STRATEGY', 'OPERATIONS', 'EXECUTION'],
      sceneLabels: ['Design', 'Deploy', 'Measure', 'Scale'],
      sceneCaption: 'Execution Architecture'
    };
  }

  function injectHeroFloats() {
    var heroTitle = document.querySelector('.hero h1');
    if (!heroTitle || heroTitle.parentElement.classList.contains('hero-headline-wrap')) return;
    var context = getTopicContext();

    var wrap = document.createElement('div');
    wrap.className = 'hero-headline-wrap';
    heroTitle.parentNode.insertBefore(wrap, heroTitle);
    wrap.appendChild(heroTitle);

    ['float-a', 'float-b', 'float-c'].forEach(function(name, idx) {
      var el = document.createElement('span');
      el.className = 'hero-float ' + name;
      el.dataset.depth = String(0.05 + (idx * 0.03));
      el.dataset.label = context.heroBadges[idx] || context.heroBadges[0];
      el.setAttribute('aria-hidden', 'true');
      wrap.appendChild(el);
    });
  }

  function addSceneSection() {
    if (document.querySelector('.scene-container')) return;
    var toc = document.querySelector('.toc');
    if (!toc || !toc.parentNode) return;
    var context = getTopicContext();

    var section = document.createElement('section');
    section.className = 'scene-container rhythm-dense';
    section.setAttribute('aria-label', 'Interactive strategic context visual');
    section.dataset.mode = context.mode;
    section.dataset.labels = context.sceneLabels.join('|');
    section.innerHTML = '<canvas width="1132" height="1132"></canvas><p class="scene-caption">' + context.sceneCaption + '</p>';
    toc.insertAdjacentElement('afterend', section);
  }

  function attachScene(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var pointer = { x: 0, y: 0 };
    var angle = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = Math.max(1, Math.floor(rect.width));
      var h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    var container = canvas.closest('.scene-container');
    var labels = ((container && container.dataset.labels) || 'Design|Deploy|Measure|Scale').split('|');
    var mode = (container && container.dataset.mode) || 'default';
    var baseProfiles = {
      floor: [0.52, 0.64, 0.56, 0.74],
      growth: [0.46, 0.58, 0.68, 0.78],
      trust: [0.58, 0.66, 0.51, 0.72],
      default: [0.5, 0.58, 0.62, 0.72]
    };
    var profile = baseProfiles[mode] || baseProfiles.default;

    function drawSystemMap(time) {
      var w = canvas.clientWidth;
      var h = canvas.clientHeight;
      if (!w || !h) return;

      ctx.clearRect(0, 0, w, h);
      angle += 0.0045;
      var chartLeft = w * 0.12;
      var chartRight = w * 0.88;
      var chartTop = h * 0.2;
      var chartBottom = h * 0.78;
      var chartHeight = chartBottom - chartTop;
      var chartWidth = chartRight - chartLeft;
      var gap = chartWidth / (labels.length - 1);
      var barWidth = Math.max(36, Math.min(90, chartWidth * 0.11));
      var pointerOffset = pointer.x * 0.03;
      var nodes = [];

      for (var g = 0; g <= 6; g += 1) {
        var yGrid = chartTop + ((chartHeight / 6) * g);
        ctx.strokeStyle = 'rgba(168, 212, 240, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartLeft - 24, yGrid);
        ctx.lineTo(chartRight + 24, yGrid);
        ctx.stroke();
      }

      for (var i = 0; i < labels.length; i += 1) {
        var x = chartLeft + (gap * i) + (pointerOffset * (i / labels.length));
        var wobble = Math.sin((time * 0.0007) + (i * 0.9)) * 0.045;
        var value = Math.max(0.24, Math.min(0.92, profile[i % profile.length] + wobble - (pointer.y * 0.0001)));
        var barHeight = chartHeight * value;
        var y = chartBottom - barHeight;

        var barGradient = ctx.createLinearGradient(0, y, 0, chartBottom);
        barGradient.addColorStop(0, 'rgba(168, 212, 240, 0.58)');
        barGradient.addColorStop(1, 'rgba(16, 53, 96, 0.25)');
        ctx.fillStyle = barGradient;
        ctx.fillRect(x - (barWidth / 2), y, barWidth, barHeight);

        ctx.strokeStyle = 'rgba(168, 212, 240, 0.26)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - (barWidth / 2), y, barWidth, barHeight);

        nodes.push({ x: x, y: y + 2 });

        ctx.fillStyle = 'rgba(168, 212, 240, 0.92)';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(4, barWidth * 0.08), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(214, 236, 251, 0.9)';
        ctx.font = '500 13px ' + getComputedStyle(document.documentElement).getPropertyValue('--mono');
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x, chartBottom + 30);
      }

      ctx.strokeStyle = 'rgba(168, 212, 240, 0.34)';
      ctx.lineWidth = 1.6;
      for (var c = 0; c < nodes.length - 1; c += 1) {
        var start = nodes[c];
        var end = nodes[c + 1];
        var midX = (start.x + end.x) / 2;
        var midY = Math.min(start.y, end.y) - (22 + (Math.sin(angle + c) * 10));

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(midX, midY, end.x, end.y);
        ctx.stroke();

        var pulseT = ((time * 0.00025) + (c * 0.22)) % 1;
        var px = (1 - pulseT) * (1 - pulseT) * start.x + 2 * (1 - pulseT) * pulseT * midX + pulseT * pulseT * end.x;
        var py = (1 - pulseT) * (1 - pulseT) * start.y + 2 * (1 - pulseT) * pulseT * midY + pulseT * pulseT * end.y;
        ctx.fillStyle = 'rgba(214, 236, 251, 0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(168, 212, 240, 0.65)';
      ctx.font = '600 14px ' + getComputedStyle(document.documentElement).getPropertyValue('--mono');
      ctx.textAlign = 'left';
      ctx.fillText('SYSTEM HEALTH', chartLeft - 6, chartTop - 16);
    }

    function render(time) {
      drawSystemMap(time || 0);
      window.requestAnimationFrame(render);
    }

    canvas.addEventListener('mousemove', function(event) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left - rect.width / 2;
      pointer.y = event.clientY - rect.top - rect.height / 2;
    });
    canvas.addEventListener('mouseleave', function() {
      pointer.x = 0;
      pointer.y = 0;
    });

    window.addEventListener('resize', resize);
    resize();
    window.requestAnimationFrame(render);
  }

  function initScenes() {
    var canvases = document.querySelectorAll('.scene-container canvas');
    canvases.forEach(attachScene);
  }

  function toFaqAccordion(section) {
    if (!section || section.querySelector('.faq-list')) return;

    var heading = section.querySelector('h2');
    var pairs = [];
    var node = heading ? heading.nextElementSibling : section.firstElementChild;

    while (node) {
      if (node.tagName === 'H3') {
        var answerNode = node.nextElementSibling;
        if (answerNode && answerNode.tagName === 'P') {
          pairs.push({
            q: node.textContent.trim(),
            a: answerNode.innerHTML
          });
          node = answerNode;
        }
      }
      node = node.nextElementSibling;
    }

    if (!pairs.length) return;

    section.querySelectorAll(':scope > h3, :scope > p').forEach(function(el) {
      el.remove();
    });

    var list = document.createElement('div');
    list.className = 'faq-list';

    pairs.forEach(function(item) {
      var row = document.createElement('div');
      row.className = 'faq-item';
      row.dataset.state = 'closed';

      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'faq-trigger';
      trigger.setAttribute('aria-expanded', 'false');
      trigger.innerHTML = '<span>' + item.q + '</span><span class="faq-icon">+</span>';

      var panel = document.createElement('div');
      panel.className = 'faq-panel';
      panel.hidden = true;
      panel.innerHTML = '<p>' + item.a + '</p>';

      row.appendChild(trigger);
      row.appendChild(panel);
      list.appendChild(row);
    });

    section.appendChild(list);
  }

  function initAccordion() {
    document.querySelectorAll('.faq').forEach(toFaqAccordion);

    document.querySelectorAll('.faq-item').forEach(function(item) {
      var trigger = item.querySelector('.faq-trigger');
      var panel = item.querySelector('.faq-panel');
      var icon = item.querySelector('.faq-icon');
      if (!trigger || !panel || !icon) return;

      trigger.addEventListener('click', function() {
        var open = item.dataset.state === 'open';
        if (open) {
          panel.style.setProperty('--accordion-content-height', panel.scrollHeight + 'px');
          item.dataset.state = 'closed';
          trigger.setAttribute('aria-expanded', 'false');
          icon.textContent = '+';
          panel.addEventListener('animationend', function handleClose() {
            panel.hidden = true;
            panel.removeEventListener('animationend', handleClose);
          });
          return;
        }

        panel.hidden = false;
        panel.style.setProperty('--accordion-content-height', panel.scrollHeight + 'px');
        item.dataset.state = 'open';
        trigger.setAttribute('aria-expanded', 'true');
        icon.textContent = '\u2212';
      });
    });
  }

  function injectFooter() {
    if (document.querySelector('.footer-reveal')) return;
    var footer = document.createElement('footer');
    footer.className = 'footer-reveal';
    footer.innerHTML = [
      '<div class="footer-inner">',
      '  <div class="footer-brand-art" aria-hidden="true"></div>',
      '  <hr class="footer-rule">',
      '  <div class="footer-meta">',
      '    <span>HM Pinnacle Consulting</span>',
      '    <span>People Ops Blueprint</span>',
      '    <a href="../index.html#contact">Contact</a>',
      '    <a href="index.html">Insights</a>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(footer);

    var main = document.querySelector('main');
    if (main) {
      main.classList.add('has-footer-reveal');
    }
  }

  function initParallax() {
    var floats = Array.prototype.slice.call(document.querySelectorAll('.hero-float'));
    if (!floats.length) return;

    function update() {
      var y = window.scrollY || window.pageYOffset;
      floats.forEach(function(el, idx) {
        var depth = Number(el.dataset.depth || (0.05 + idx * 0.03));
        el.style.transform = 'translate3d(0,' + (y * depth).toFixed(2) + 'px,0)';
      });
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function init() {
    loadLenis();
    injectHeroFloats();
    addSceneSection();
    initScenes();
    initAccordion();
    injectFooter();
    initParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
