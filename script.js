// Linn-Henley Centennial — shared site behavior

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- fundraising vision — flip cards ----------
     :hover (see styles.css) already flips a card for mouse users. A tap
     or keyboard Enter/Space toggles the same "is-flipped" class here
     instead of relying on :focus-within — a tapped card stays focused
     afterward, so :focus-within would never let a second tap flip it
     back. */
  document.querySelectorAll('.thumb-flip').forEach(function (card) {
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', 'false');
    function toggleFlip() {
      var flipped = card.classList.toggle('is-flipped');
      card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    }
    card.addEventListener('click', toggleFlip);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        toggleFlip();
      }
    });
  });

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
     height, tier-head height, font size, or viewport height. All four
     tiers are direct children of .tier-list and share it as one sticky
     containing block — the classic "stacking cards" setup, where each
     earlier tier stays stuck UNDER the ones stacking on top of it (an
     actual overlap, collapsing to just its price/title row) for as long
     as .tier-list still has height left below it. Splitting each tier
     into its own isolated wrapper was tried at one point to stop the
     last tier from ever covering the others, but an isolated wrapper's
     sticky range can only ever run out exactly where that tier's own
     box ends — so the next tier always arrived a beat late, after a
     visible blank gap, no matter how much buffer the wrapper was given.
     A shared container avoids that (the next tier's arrival naturally
     overlaps the previous one's stuck range), at the cost of needing a
     bit of care at the very end of the list, handled below. */
  function setupGivingStack() {
    var tierList = document.querySelector('.tier-list');
    var tiers = Array.prototype.slice.call(document.querySelectorAll('.tier'));
    var titleWrap = document.querySelector('.giving-sticky-title');
    if (!tierList || !tiers.length) return;

    tiers.forEach(function (tier, i) {
      tier.classList.add('tier-step-' + (i + 1));
    });

    // Reset earlier-applied sizing first so this stays idempotent (resize
    // re-runs it from scratch rather than compounding).
    tiers.forEach(function (tier) { tier.style.minHeight = ''; });

    var lastTier = tiers[tiers.length - 1];
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

    // A shared sticky container makes an EARLIER (lower z-index) tier stay
    // stuck as long as there's still container height left below it — and
    // since a shared container's remaining height keeps shrinking as later
    // tiers use it up, a tier further down the list always runs out of
    // that shared runway, and so releases, sooner than the ones above it.
    // Once released it just continues scrolling normally, at the same
    // rate as the page, same as it would with no sticky behavior at all —
    // and because the LAST tier ("The Heritage Friend") has the highest
    // z-index, if it's still releasing/scrolling normally while an
    // earlier tier is still stuck, it visually climbs up and over that
    // tier's still-visible collapsed row instead of stopping to sit
    // cleanly beneath it. The gap between when an earlier tier releases
    // and when a later one does is exactly headH per step *plus* however
    // much taller the later tier's own box is than the earlier one's —
    // so as long as every tier's box is at least about as tall as every
    // tier that comes after it, that gap can only ever be crossed by
    // less than one step's worth of scrolling, which isn't enough for a
    // later tier to climb far enough to reach an earlier one before that
    // earlier one has ALSO already released. Padding each tier's box up
    // to (at least) the height of the next one plus a small margin
    // guarantees that, without needing to touch any tier's real content.
    var HEIGHT_MARGIN = 18;
    var floor = tiers[tiers.length - 1].offsetHeight;
    for (var i = tiers.length - 2; i >= 0; i--) {
      var need = floor + HEIGHT_MARGIN;
      if (tiers[i].offsetHeight < need) {
        tiers[i].style.minHeight = need + 'px';
        floor = need;
      } else {
        floor = tiers[i].offsetHeight;
      }
    }

    // With a shared container, .tier-list's natural height (just the sum
    // of the tiers' own heights) ends exactly where the LAST tier's own
    // box ends — there's nothing after it to lend it any extra runway,
    // so it would never get to sit stuck for even an instant before
    // continuing to scroll away with the page. A little extra height
    // added to .tier-list itself buys it real, visible dwell time.
    // Crucially, this buffer has to be real CONTENT inside .tier-list,
    // not padding-bottom on .tier-list itself — a sticky element's range
    // is bounded by its containing block's *content* edge, which sits
    // inside the parent's own padding, so padding added to the parent
    // doesn't move that edge at all (confirmed by testing: the last tier
    // kept zero slack with padding-bottom alone). A plain spacer div
    // sized via height, appended after the last tier, is real content
    // and does move it. It also can't live on the last tier's own box:
    // making that tier's own box taller needs LESS additional scroll for
    // its own bottom edge to reach the container's bottom — the opposite
    // of what's wanted here.
    var spacer = tierList.querySelector('.tier-dwell-spacer');
    if (!spacer) {
      spacer = document.createElement('div');
      spacer.className = 'tier-dwell-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      tierList.appendChild(spacer);
    }
    spacer.style.height = Math.round(headH * 1.4) + 'px';
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

  /* ---------- notable holdings — mobile tap-to-view lightbox ---------- */
  var holdingsLightbox = document.getElementById('holdingsLightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('closeLightbox');
  var holdingsMobileItems = document.querySelectorAll('.holdings-mobile-item');

  function openLightbox(src, alt) {
    if (!holdingsLightbox || !lightboxImg || !src) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    holdingsLightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!holdingsLightbox) return;
    holdingsLightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
  holdingsMobileItems.forEach(function (item) {
    item.addEventListener('click', function () {
      openLightbox(item.getAttribute('data-lightbox-src'), item.getAttribute('data-lightbox-alt'));
    });
  });
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (holdingsLightbox) {
    holdingsLightbox.addEventListener('click', function (e) {
      if (e.target === holdingsLightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
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

  // Below 900px, CSS itself (see the max-width:900px block in styles.css)
  // drops the pin/stack effect to a plain static title + stacked cards, so
  // there's nothing here to undo beyond the transform/height reset. But
  // .stat-row can ALSO wrap to two lines anywhere from 900px up to about
  // 1180px — 4 cards at 230px plus three 60px gaps need ~1100px, and the
  // container doesn't reliably offer that until its own max-width is
  // reached — and the gather/reveal math below assumes a single row, so a
  // wrapped row breaks it (the "revealed" cards end up in a broken
  // two-line layout instead of the intended one-line stat-row). Rather
  // than guess a second pixel breakpoint, this checks the row's ACTUAL
  // rendered layout and falls back to the same static presentation CSS
  // already uses below 900px whenever the cards don't all share one line.
  function disableNumbersStack() {
    numbersPinWrap.style.height = 'auto';
    numbersPin.style.position = 'static';
    numbersPin.style.height = 'auto';
    numbersPin.style.overflow = 'visible';
    numbersPin.style.display = 'block';
    if (numbersTitle) numbersTitle.style.position = 'static';
    numbersStackOffsets = null;
    numbersMaxScroll = 0;
  }

  function enableNumbersStack() {
    numbersPinWrap.style.height = '';
    numbersPin.style.position = '';
    numbersPin.style.overflow = '';
    numbersPin.style.display = '';
    if (numbersTitle) numbersTitle.style.position = '';
  }

  function layoutNumbersStack() {
    if (!numbersPinWrap || !numbersPin || !statRow || !statCards.length) return;

    // Reset first so measurements reflect natural (untransformed) layout —
    // idempotent across repeated calls (resize).
    statCards.forEach(function (card) { card.style.transform = ''; });
    numbersPin.style.height = '';
    enableNumbersStack();

    if (window.innerWidth < 900) {
      disableNumbersStack();
      return;
    }

    var firstCardTop = statCards[0].getBoundingClientRect().top;
    var wraps = Array.prototype.some.call(statCards, function (card) {
      return Math.abs(card.getBoundingClientRect().top - firstCardTop) > 2;
    });
    if (wraps) {
      disableNumbersStack();
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
