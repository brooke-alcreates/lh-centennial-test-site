// Linn-Henley Centennial — shared site behavior

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- header height (drives full-height hero) ---------- */
  var siteHeader = document.querySelector('.site-header');
  function setHeaderHeight() {
    if (siteHeader) {
      document.documentElement.style.setProperty('--header-h', siteHeader.offsetHeight + 'px');
    }
  }
  setHeaderHeight();

  /* ---------- Giving Opportunities sticky stack ----------
     Computes exact pixel offsets (rather than trusting guessed CSS
     constants) so the effect holds up under any header height, title
     height, tier-head height, font size, or viewport height:
     - each tier sticks directly under the sticky title + the tiers
       stacked above it, so every earlier tier fully collapses to just
       its price/title row before the next one covers it
     - the tier list gets only the *shortfall* of trailing scroll room
       the last tier actually needs to reach its own stacked position
       (often zero), instead of a fixed guess that left dead space. */
  function setupGivingStack() {
    var tierList = document.querySelector('.tier-list');
    var tiers = document.querySelectorAll('.tier');
    var titleWrap = document.querySelector('.giving-sticky-title');
    if (!tierList || !tiers.length) return;

    var lastTier = tiers[tiers.length - 1];
    var baseBottomPad = 30; // matches the --tier padding: 0 32px 30px rule

    // Reset first so this is idempotent across repeated calls (resize).
    lastTier.style.paddingBottom = baseBottomPad + 'px';

    var headerH = siteHeader ? siteHeader.offsetHeight : 0;
    var titleH = titleWrap ? titleWrap.offsetHeight : 0;
    var firstHead = tiers[0].querySelector('.tier-head');
    var headH = firstHead ? firstHead.offsetHeight : 84;

    if (titleWrap) {
      titleWrap.style.top = headerH + 'px';
      titleWrap.style.zIndex = tiers.length + 10;
    }

    var baseTop = headerH + titleH;
    tiers.forEach(function (tier, i) {
      tier.style.top = (baseTop + i * headH) + 'px';
      tier.style.zIndex = i + 1;
    });

    // Natural (un-stuck) document position of the last tier = the tier
    // list's own top plus the rendered height of every tier before it.
    // (offsetHeight of a sticky element still reflects its normal-flow
    // box height, so this is safe to read regardless of scroll position.)
    var listTop = tierList.getBoundingClientRect().top + window.scrollY;
    var naturalTopLast = listTop;
    for (var i = 0; i < tiers.length - 1; i++) {
      naturalTopLast += tiers[i].offsetHeight;
    }
    var lastTopOffset = baseTop + (tiers.length - 1) * headH;
    var requiredScroll = naturalTopLast - lastTopOffset;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    var shortfall = requiredScroll - maxScroll;

    // Any shortfall becomes extra bottom padding on the LAST card itself
    // (which already has a solid background) rather than blank space on
    // the container below it — so if any runway is still needed, it reads
    // as generous card padding, not a stray gap before the CTA button.
    if (shortfall > 0) {
      lastTier.style.paddingBottom = Math.ceil(baseBottomPad + shortfall + 2) + 'px';
    }
  }

  setupGivingStack();

  /* ---------- timeline horizontal scroll (about page) ----------
     Echoes saapro.ae's "how it works" section: the track pins in place
     and slides horizontally as the page scrolls vertically through the
     wrapper's extra height. Entries alternate above/below a stationary
     dashed line (layoutTimelineAlternate below) rather than all sitting
     below it. Below 900px the effect is dropped (CSS switches the pin
     to static / the track to a stacked column), so the JS mirrors that
     breakpoint rather than fighting it. */
  var timelineWrap = document.getElementById('timelineWrap');
  var timelineTrack = document.getElementById('timelineTrack');
  var timelinePin = document.querySelector('.timeline-pin');
  var timelineLine = document.getElementById('timelineLine');
  var timelineItems = document.querySelectorAll('.t-item');
  var timelineMaxTranslate = 0;

  // Measures each entry's natural content height, then pads/sizes every
  // entry so "below" entries start right after the line and "above"
  // entries end right before it — regardless of how much copy each one
  // has — and positions the (stationary) line at the seam between them.
  function layoutTimelineAlternate() {
    if (!timelineLine || !timelineItems.length || !timelinePin) return;

    // Reset first so this is idempotent across repeated calls (resize).
    timelineItems.forEach(function (item) {
      item.style.height = '';
      item.style.paddingTop = '';
      item.style.paddingBottom = '';
    });

    if (window.innerWidth < 900) {
      timelinePin.style.height = '';
      return;
    }

    var lineGap = 34; // total breathing room between the two sides and the line

    var maxAbove = 0, maxBelow = 0;
    timelineItems.forEach(function (item) {
      var h = item.scrollHeight;
      if (item.classList.contains('t-above')) maxAbove = Math.max(maxAbove, h);
      else maxBelow = Math.max(maxBelow, h);
    });

    var contentHeight = maxAbove + lineGap + maxBelow;
    timelineItems.forEach(function (item) {
      item.style.height = contentHeight + 'px';
      if (item.classList.contains('t-above')) {
        item.style.paddingBottom = (lineGap + maxBelow) + 'px';
      } else {
        item.style.paddingTop = (maxAbove + lineGap) + 'px';
      }
    });

    timelineLine.style.top = (maxAbove + lineGap / 2) + 'px';

    var pinPadding = 4; // vertical breathing room within the sticky pin
    timelinePin.style.height = (contentHeight + pinPadding) + 'px';
  }

  function recalcTimeline() {
    if (!timelineWrap || !timelineTrack || !timelinePin) return;

    layoutTimelineAlternate();

    if (window.innerWidth < 900) {
      timelineWrap.style.height = '';
      timelineTrack.style.transform = '';
      timelineMaxTranslate = 0;
      return;
    }

    timelineTrack.style.transform = 'translateX(0px)'; // reset before measuring
    var trackWidth = timelineTrack.scrollWidth;
    // The visible "window" for the slide is the timeline's own box (which
    // matches the centered .container), not the full-width sticky pin —
    // using the pin's own width would overstate how much room is visible
    // and could report zero room to scroll even when the track already
    // overflows the container.
    var viewportWidth = timelineTrack.parentElement.clientWidth;
    timelineMaxTranslate = Math.max(0, trackWidth - viewportWidth);
    timelineWrap.style.height = (timelinePin.offsetHeight + timelineMaxTranslate) + 'px';
    onTimelineScroll();
  }

  function onTimelineScroll() {
    if (!timelineWrap || !timelineTrack || timelineMaxTranslate <= 0) return;
    var rect = timelineWrap.getBoundingClientRect();
    var scrolled = -rect.top;
    var progress = Math.min(1, Math.max(0, scrolled / timelineMaxTranslate));
    timelineTrack.style.transform = 'translateX(' + (-progress * timelineMaxTranslate) + 'px)';
  }

  if (timelineWrap && timelineTrack && timelinePin) {
    recalcTimeline();
    window.addEventListener('scroll', onTimelineScroll, { passive: true });
  }

  /* ---------- notable holdings — align each photo with its caption ----------
     The photos keep their varied size/rotation/left offset from CSS (for
     the scattered-collage look), but their vertical position is measured
     from the matching caption in .holdings-copy so photo N always lines
     up with caption N, overlapping naturally where captions sit closer
     together than the photos are tall. */
  function layoutHoldingPhotos() {
    var container = document.querySelector('.holdings-photos');
    var photos = document.querySelectorAll('.hphoto');
    var textItems = document.querySelectorAll('.holdings-copy .holding-text');
    if (!container || !photos.length || !textItems.length) return;

    var containerTop = container.getBoundingClientRect().top + window.scrollY;
    var maxBottom = 0;

    textItems.forEach(function (item, i) {
      var photo = photos[i];
      if (!photo) return;
      var itemRect = item.getBoundingClientRect();
      var itemCenter = itemRect.top + window.scrollY + itemRect.height / 2;
      var size = photo.offsetHeight || parseFloat(getComputedStyle(photo).height) || 150;
      var top = itemCenter - containerTop - size / 2;
      photo.style.top = Math.max(0, top) + 'px';
      maxBottom = Math.max(maxBottom, Math.max(0, top) + size);
    });

    container.style.height = (maxBottom + 20) + 'px';
  }

  var resizeTimer;
  function scheduleRecalc() {
    setHeaderHeight();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setupGivingStack();
      recalcTimeline();
      layoutHoldingPhotos();
      layoutNumbersStack();
    }, 150);
  }
  window.addEventListener('resize', scheduleRecalc);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      setHeaderHeight();
      setupGivingStack();
      recalcTimeline();
      layoutHoldingPhotos();
      layoutNumbersStack();
    });
  }
  window.addEventListener('load', function () {
    setHeaderHeight();
    setupGivingStack();
    recalcTimeline();
    layoutHoldingPhotos();
    layoutNumbersStack();
  });

  // Initial pass (before fonts/load fire) so there's no flash of
  // unlaid-out photos on fast-loading pages.
  layoutHoldingPhotos();

  /* ---------- mobile nav ---------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- contact modal ---------- */
  var modal = document.getElementById('contactModal');
  var closeBtn = document.getElementById('closeContact');
  var openTriggers = document.querySelectorAll('[data-open-contact]');
  var contactForm = document.getElementById('contactForm');

  function openModal(e) {
    if (e) e.preventDefault();
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  openTriggers.forEach(function (el) { el.addEventListener('click', openModal); });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      // Test site: no backend wired up yet — just acknowledge the submission.
      var box = modal.querySelector('.modal-box');
      box.innerHTML = '<h2>Thank you</h2><p class="modal-lede">Your note has been received. We will be in touch soon.</p>';
      setTimeout(closeModal, 1600);
    });
  }

  /* ---------- "by the numbers" — pinned 3D stack, fanning into a row ----------
     The title pins under the header (same trick as Giving Opportunities)
     while, beneath it, the stat cards start gathered into a small offset/
     rotated deck and fan out into their normal row as the section's
     scroll runway plays out — each card peeling off on its own staggered
     beat rather than everything moving at once. */
  var numbersPinWrap = document.getElementById('numbersPinWrap');
  var numbersPin = document.getElementById('numbersPin');
  var numbersTitle = document.querySelector('.numbers-sticky-title');
  var statRow = document.getElementById('statRow');
  var statCards = document.querySelectorAll('.stat-card');
  var numbersMaxScroll = 0;
  var numbersStackOffsets = null;

  // Small alternating spread + rotation so the gathered cards read as an
  // untidy little stack rather than a single flat rectangle; finalRotate
  // is each card's resting tilt once fully revealed (unchanged from the
  // original two-card design, extended to the same alternating pattern).
  var stackJitterX = [-14, 10, -8, 14];
  var stackJitterY = [-10, -4, 6, 12];
  var stackJitterRotate = [-9, 6, -5, 8];
  var finalRotate = [-2, 2, -2, 2];

  function layoutNumbersStack() {
    if (!numbersPinWrap || !numbersPin || !statRow || !statCards.length) return;

    // Reset first so measurements reflect natural (untransformed) layout —
    // idempotent across repeated calls (resize).
    statCards.forEach(function (card) { card.style.transform = ''; });
    numbersPin.style.height = '';

    if (window.innerWidth < 900) {
      numbersPinWrap.style.height = '';
      numbersStackOffsets = null;
      return;
    }

    var titleH = numbersTitle ? numbersTitle.offsetHeight : 0;
    var headerH = siteHeader ? siteHeader.offsetHeight : 0;
    numbersPin.style.top = (headerH + titleH) + 'px';

    // Pull-to-center offsets: how far each card sits from the row's own
    // center in its natural, spread-out position — negating that (plus a
    // small jitter) is what gathers the cards into a stack at progress 0.
    var rowRect = statRow.getBoundingClientRect();
    var rowCenterX = rowRect.left + rowRect.width / 2;
    var rowCenterY = rowRect.top + rowRect.height / 2;

    numbersStackOffsets = Array.prototype.map.call(statCards, function (card, i) {
      var r = card.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      card.style.zIndex = statCards.length - i + 5;
      return {
        x: (rowCenterX - cx) + (stackJitterX[i] || 0),
        y: (rowCenterY - cy) + (stackJitterY[i] || 0),
        rotate: stackJitterRotate[i] || 0
      };
    });

    // The pin's box has to be taller than the cards' flat, un-rotated
    // height, or a tilted card's corners get clipped by the pin's own
    // overflow:hidden edge (a rotated box sweeps a taller bounding area
    // than its unrotated height). Pad it out by that swept extra height,
    // plus the largest vertical stack jitter, on both top and bottom —
    // align-items:center on the pin then distributes that padding evenly
    // above and below the cards.
    var maxTiltDeg = 0;
    stackJitterRotate.concat(finalRotate).forEach(function (d) {
      maxTiltDeg = Math.max(maxTiltDeg, Math.abs(d));
    });
    var maxJitterY = 0;
    stackJitterY.forEach(function (d) { maxJitterY = Math.max(maxJitterY, Math.abs(d)); });
    var cardWidth = statCards[0].getBoundingClientRect().width;
    var tiltBuffer = cardWidth * Math.sin(maxTiltDeg * Math.PI / 180) + maxJitterY + 20;

    var pinH = rowRect.height + tiltBuffer * 2;
    numbersPin.style.height = pinH + 'px';

    // Scroll runway has two parts: revealRunway is the stack-to-row
    // animation itself (progress 0 -> 1); holdRunway is extra scroll
    // room AFTER that so the fully fanned-out cards sit still for a
    // while — instead of sliding out of view the instant the reveal
    // finishes — before the section finally releases.
    var revealRunway = Math.max(500, pinH * 1.6);
    var holdRunway = Math.max(600, pinH * 1.4);
    numbersMaxScroll = revealRunway;
    numbersPinWrap.style.height = (pinH + revealRunway + holdRunway) + 'px';

    onNumbersScroll();
  }

  function onNumbersScroll() {
    if (!numbersPinWrap || !numbersStackOffsets || numbersMaxScroll <= 0) return;
    if (window.innerWidth < 900) return;

    var rect = numbersPinWrap.getBoundingClientRect();
    var scrolled = -rect.top;
    var progress = Math.min(1, Math.max(0, scrolled / numbersMaxScroll));

    statCards.forEach(function (card, i) {
      // Stagger so later cards peel off a beat after earlier ones.
      var start = i * 0.16;
      var t = Math.min(1, Math.max(0, (progress - start) / (1 - start)));
      var eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

      var off = numbersStackOffsets[i];
      var x = off.x * (1 - eased);
      var y = off.y * (1 - eased);
      var toRotate = finalRotate[i] || 0;
      var rotate = off.rotate + (toRotate - off.rotate) * eased;

      card.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + rotate + 'deg)';
    });
  }

  if (numbersPinWrap && numbersPin && statRow && statCards.length) {
    layoutNumbersStack();
    window.addEventListener('scroll', onNumbersScroll, { passive: true });
  }
});
