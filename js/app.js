/**
 * WanderNest Travels - Global Interactive Application Logic
 */

(function () {
  'use strict';

  // --- Currency Configuration ---
  const CURRENCY_RATES = {
    INR: { symbol: '₹', rate: 1, label: 'INR (₹)' },
    USD: { symbol: '$', rate: 0.012, label: 'USD ($)' },
    EUR: { symbol: '€', rate: 0.011, label: 'EUR (€)' },
    GBP: { symbol: '£', rate: 0.0095, label: 'GBP (£)' }
  };

  let currentCurrency = localStorage.getItem('wandernest_currency') || 'INR';

  function formatPrice(amountInINR) {
    const config = CURRENCY_RATES[currentCurrency] || CURRENCY_RATES.INR;
    const converted = Math.round(amountInINR * config.rate);
    return `${config.symbol}${converted.toLocaleString()}`;
  }

  function updateAllPrices() {
    document.querySelectorAll('[data-inr-price]').forEach(el => {
      const inr = parseFloat(el.getAttribute('data-inr-price'));
      if (!isNaN(inr)) {
        el.textContent = formatPrice(inr);
      }
    });
  }

  function setupCurrencySwitcher() {
    const selector = document.getElementById('currencySelector');
    if (selector) {
      selector.value = currentCurrency;
      selector.addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        localStorage.setItem('wandernest_currency', currentCurrency);
        updateAllPrices();
        showToast(`Currency changed to ${currentCurrency}`, 'info');
      });
    }
  }

  // --- Toast Notification System ---
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.35s forwards';
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // --- Wishlist / Favorites System ---
  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem('wandernest_wishlist')) || [];
    } catch (e) {
      return [];
    }
  }

  function saveWishlist(items) {
    localStorage.setItem('wandernest_wishlist', JSON.stringify(items));
    updateWishlistBadges();
  }

  function isItemInWishlist(id) {
    return getWishlist().some(item => item.id === id);
  }

  function toggleWishlistItem(itemData) {
    let list = getWishlist();
    const index = list.findIndex(i => i.id === itemData.id);
    if (index > -1) {
      list.splice(index, 1);
      saveWishlist(list);
      showToast(`Removed "${itemData.title}" from saved trips`, 'info');
      return false;
    } else {
      list.push(itemData);
      saveWishlist(list);
      showToast(`Saved "${itemData.title}" to your wishlist!`, 'success');
      return true;
    }
  }

  function updateWishlistBadges() {
    const count = getWishlist().length;
    document.querySelectorAll('.wishlist-count-badge').forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function setupWishlistButtons() {
    document.querySelectorAll('.pkg-heart-btn').forEach(btn => {
      const id = btn.getAttribute('data-id');
      if (id && isItemInWishlist(id)) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('.pkg-card');
        if (!card) return;

        const pkgId = btn.getAttribute('data-id') || 'pkg-' + Date.now();
        const title = card.querySelector('h3')?.textContent.trim() || 'Holiday Package';
        const img = card.querySelector('.pkg-img img')?.src || '';
        const tag = card.querySelector('.pkg-tag')?.textContent.trim() || 'Tour';
        const meta = card.querySelector('.pkg-meta')?.textContent.trim() || '';
        const inrPrice = parseFloat(card.querySelector('[data-inr-price]')?.getAttribute('data-inr-price')) || 50000;

        const item = { id: pkgId, title, img, tag, meta, inrPrice };
        const isAdded = toggleWishlistItem(item);
        btn.classList.toggle('active', isAdded);

        if (window.renderWishlistPage) {
          window.renderWishlistPage();
        }
      });
    });
  }

  // --- Global Booking Modal Engine ---
  let selectedBookingPackage = null;
  let bookingStepIndex = 1;

  function initBookingModal() {
    let modal = document.getElementById('globalBookingModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'globalBookingModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card">
          <button class="modal-close-btn" id="closeBookingModal" aria-label="Close modal">&times;</button>
          <div class="modal-header">
            <div class="eyebrow">Instant Reservation</div>
            <h3 id="bookingModalTitle">Plan & Book Your Journey</h3>
            <p id="bookingModalSubtitle">Customize your dates, guest count, and personalized concierge options.</p>
          </div>

          <div class="booking-steps-bar">
            <div class="step-indicator active" id="stepIndicator1">
              <span class="step-bubble">1</span> Dates & Details
            </div>
            <div class="step-indicator" id="stepIndicator2">
              <span class="step-bubble">2</span> Traveler Info
            </div>
            <div class="step-indicator" id="stepIndicator3">
              <span class="step-bubble">3</span> Confirmation
            </div>
          </div>

          <!-- Step 1: Package & Options -->
          <form id="bookingFormStep1" class="booking-step active">
            <div class="form-grid">
              <div class="form-field full">
                <label for="bmPackageSelect">Selected Tour Package</label>
                <select id="bmPackageSelect" required>
                  <option value="goa-honeymoon" data-price="64900">Goa Honeymoon Escape - ₹64,900</option>
                  <option value="kerala-family" data-price="58500">Kerala Backwaters Family Retreat - ₹58,500</option>
                  <option value="ladakh-adventure" data-price="49900">Ladakh High Altitude Trail - ₹49,900</option>
                  <option value="himachal-solo" data-price="22400">Himachal Pine Valley Solo Expedition - ₹22,400</option>
                  <option value="kashmir-luxury" data-price="78000">Kashmir Dal Lake & Gulmarg Splendour - ₹78,000</option>
                  <option value="andaman-islands" data-price="84500">Andaman Coral & Private Beach Charter - ₹84,500</option>
                  <option value="rajasthan-royal" data-price="72000">Royal Rajasthan Haveli & Desert Trail - ₹72,000</option>
                  <option value="coorg-weekend" data-price="16900">Coorg Coffee Estate Weekend - ₹16,900</option>
                  <option value="custom-trip" data-price="45000">Tailor-Made Custom Journey - ₹45,000</option>
                </select>
              </div>

              <div class="form-field">
                <label for="bmTravelDate">Departure Date</label>
                <input type="date" id="bmTravelDate" required>
              </div>

              <div class="form-field">
                <label for="bmDuration">Duration</label>
                <select id="bmDuration">
                  <option value="4N / 5D">4 Nights / 5 Days</option>
                  <option value="5N / 6D" selected>5 Nights / 6 Days</option>
                  <option value="7N / 8D">7 Nights / 8 Days</option>
                  <option value="10N / 11D">10 Nights / 11 Days</option>
                </select>
              </div>

              <div class="form-field">
                <label for="bmAdults">Adults (12+ yrs)</label>
                <select id="bmAdults">
                  <option value="1">1 Person</option>
                  <option value="2" selected>2 Persons</option>
                  <option value="3">3 Persons</option>
                  <option value="4">4 Persons</option>
                  <option value="6">6+ Group</option>
                </select>
              </div>

              <div class="form-field">
                <label for="bmChildren">Children (under 12 yrs)</label>
                <select id="bmChildren">
                  <option value="0" selected>0 Children</option>
                  <option value="1">1 Child</option>
                  <option value="2">2 Children</option>
                </select>
              </div>

              <div class="form-field full">
                <label for="bmStayType">Stay Preference</label>
                <select id="bmStayType">
                  <option value="deluxe" data-surcharge="0">Heritage Boutique Resort (Standard Inclusions)</option>
                  <option value="suite" data-surcharge="12000">Luxury Premium Suite (+₹12,000)</option>
                  <option value="villa" data-surcharge="25000">Private Ocean / Mountain Pool Villa (+₹25,000)</option>
                </select>
              </div>
            </div>

            <div class="booking-summary-box" style="margin-top: 24px;">
              <div class="booking-summary-row">
                <span>Estimated Package Total:</span>
                <span id="bmLiveTotal" style="font-weight: 700; color: var(--ocean);">₹64,900</span>
              </div>
              <div style="font-size: 12px; color: var(--text-soft); margin-top: 4px;">
                *Includes accommodation, private chauffeur, breakfast, permits & taxes.
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
              <button type="button" class="btn btn-ghost" id="cancelBookingStep1">Cancel</button>
              <button type="submit" class="btn btn-primary">Proceed to Traveler Info &rarr;</button>
            </div>
          </form>

          <!-- Step 2: Traveler Contact & Addons -->
          <form id="bookingFormStep2" class="booking-step">
            <div class="form-grid">
              <div class="form-field">
                <label for="bmFullName">Full Name</label>
                <input type="text" id="bmFullName" placeholder="e.g. Ananya Sharma" required>
              </div>

              <div class="form-field">
                <label for="bmEmail">Email Address</label>
                <input type="email" id="bmEmail" placeholder="ananya@example.com" required>
              </div>

              <div class="form-field">
                <label for="bmPhone">Mobile Number (WhatsApp)</label>
                <input type="tel" id="bmPhone" placeholder="+91 98765 43210" required>
              </div>

              <div class="form-field">
                <label for="bmCity">Departure City</label>
                <input type="text" id="bmCity" placeholder="e.g. Mumbai, Delhi, Bangalore" required>
              </div>

              <div class="form-field full">
                <label>Complimentary Concierge Add-ons</label>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
                  <label style="font-size: 13.5px; font-weight: normal; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="addonFlights" checked> Domestic Flight Booking Concierge
                  </label>
                  <label style="font-size: 13.5px; font-weight: normal; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="addonInsurance" checked> Comprehensive Travel Health & Bag Insurance
                  </label>
                  <label style="font-size: 13.5px; font-weight: normal; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="addonDiet"> Special Dietary / Vegetarian / Jain Meals Pacing
                  </label>
                </div>
              </div>

              <div class="form-field full">
                <label for="bmNotes">Special Requests & Honeymoon / Celebration Notes</label>
                <textarea id="bmNotes" rows="2" placeholder="Any special occasions, room floor preferences, or private guides?"></textarea>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 12px; margin-top: 24px;">
              <button type="button" class="btn btn-ghost" id="backToStep1">&larr; Back</button>
              <button type="submit" class="btn btn-sunset">Confirm & Generate Reservation &rarr;</button>
            </div>
          </form>

          <!-- Step 3: Confirmation Ticket -->
          <div id="bookingStep3" class="booking-step">
            <div style="text-align: center; padding: 10px 0 20px;">
              <div style="width: 60px; height: 60px; background: #D1FAE5; color: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h4 style="font-size: 24px; margin-bottom: 6px;">Reservation Request Confirmed!</h4>
              <p style="color: var(--text-soft); font-size: 14.5px;">Your WanderNest trip reference code is: <strong id="resCode" style="color: var(--ocean);">WN-2026-8941</strong></p>
            </div>

            <div class="booking-summary-box">
              <div class="booking-summary-row">
                <span>Trip:</span>
                <strong id="confirmTripName">Goa Honeymoon Escape</strong>
              </div>
              <div class="booking-summary-row">
                <span>Traveler:</span>
                <span id="confirmTravelerName">Ananya Sharma</span>
              </div>
              <div class="booking-summary-row">
                <span>Departure:</span>
                <span id="confirmTravelDate">Nov 15, 2026</span>
              </div>
              <div class="booking-summary-row">
                <span>Party Size:</span>
                <span id="confirmGuests">2 Adults</span>
              </div>
              <div class="booking-summary-row total">
                <span>Estimated Quotation:</span>
                <span id="confirmTotalPrice">₹64,900</span>
              </div>
            </div>

            <p style="font-size: 13px; color: var(--text-soft); text-align: center; margin-bottom: 24px;">
              A personal trip specialist will contact you on WhatsApp / Phone within 30 minutes with your tailored day-by-day PDF itinerary and private payment link.
            </p>

            <div style="display: flex; justify-content: center; gap: 14px;">
              <button type="button" class="btn btn-ghost" id="printBookingSummary">Download / Print Voucher</button>
              <button type="button" class="btn btn-primary" id="finishBookingModal">Done</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Event Handlers for modal
      const closeBtn = modal.querySelector('#closeBookingModal');
      const cancelBtn = modal.querySelector('#cancelBookingStep1');
      const finishBtn = modal.querySelector('#finishBookingModal');
      const printBtn = modal.querySelector('#printBookingSummary');
      const backBtn = modal.querySelector('#backToStep1');
      const pkgSelect = modal.querySelector('#bmPackageSelect');
      const staySelect = modal.querySelector('#bmStayType');
      const adultsSelect = modal.querySelector('#bmAdults');
      const liveTotal = modal.querySelector('#bmLiveTotal');

      function calculateTotal() {
        const opt = pkgSelect.options[pkgSelect.selectedIndex];
        const base = parseFloat(opt.getAttribute('data-price')) || 50000;
        const staySurcharge = parseFloat(staySelect.options[staySelect.selectedIndex].getAttribute('data-surcharge')) || 0;
        const adults = parseInt(adultsSelect.value) || 2;
        
        let total = base + staySurcharge;
        if (adults > 2) {
          total += (adults - 2) * 12000;
        }
        liveTotal.textContent = formatPrice(total);
        return total;
      }

      pkgSelect.addEventListener('change', calculateTotal);
      staySelect.addEventListener('change', calculateTotal);
      adultsSelect.addEventListener('change', calculateTotal);

      // Set minimum date to tomorrow
      const dateInput = modal.querySelector('#bmTravelDate');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.min = tomorrow.toISOString().split('T')[0];
      dateInput.value = tomorrow.toISOString().split('T')[0];

      // Step 1 Submit
      modal.querySelector('#bookingFormStep1').addEventListener('submit', (e) => {
        e.preventDefault();
        calculateTotal();
        goToStep(2);
      });

      // Step 2 Submit
      modal.querySelector('#bookingFormStep2').addEventListener('submit', (e) => {
        e.preventDefault();
        const randCode = 'WN-' + Math.floor(1000 + Math.random() * 9000);
        modal.querySelector('#resCode').textContent = randCode;
        modal.querySelector('#confirmTripName').textContent = pkgSelect.options[pkgSelect.selectedIndex].text.split(' - ')[0];
        modal.querySelector('#confirmTravelerName').textContent = modal.querySelector('#bmFullName').value;
        modal.querySelector('#confirmTravelDate').textContent = modal.querySelector('#bmTravelDate').value;
        modal.querySelector('#confirmGuests').textContent = `${modal.querySelector('#bmAdults').value} Adults, ${modal.querySelector('#bmChildren').value} Children`;
        modal.querySelector('#confirmTotalPrice').textContent = liveTotal.textContent;

        goToStep(3);
        showToast('Reservation request submitted successfully!', 'success');
      });

      backBtn.addEventListener('click', () => goToStep(1));
      [closeBtn, cancelBtn, finishBtn].forEach(b => {
        if (b) b.addEventListener('click', () => modal.classList.remove('active'));
      });

      printBtn.addEventListener('click', () => window.print());

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }

    function goToStep(step) {
      bookingStepIndex = step;
      document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.step-indicator').forEach((ind, i) => {
        ind.classList.toggle('active', i + 1 <= step);
      });

      if (step === 1) document.getElementById('bookingFormStep1').classList.add('active');
      if (step === 2) document.getElementById('bookingFormStep2').classList.add('active');
      if (step === 3) document.getElementById('bookingStep3').classList.add('active');
    }
  }

  function openBookingModal(packageId = null, packageName = null) {
    initBookingModal();
    const modal = document.getElementById('globalBookingModal');
    if (!modal) return;

    if (packageId) {
      const select = modal.querySelector('#bmPackageSelect');
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === packageId || select.options[i].text.toLowerCase().includes(packageName?.toLowerCase())) {
          select.selectedIndex = i;
          break;
        }
      }
    }

    // Reset to step 1
    document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));
    document.getElementById('bookingFormStep1').classList.add('active');
    document.querySelectorAll('.step-indicator').forEach((ind, i) => {
      ind.classList.toggle('active', i === 0);
    });

    modal.classList.add('active');
  }

  // --- Destination Quick View Modal ---
  const DESTINATIONS_DATA = {
    goa: {
      name: 'Goa',
      eyebrow: 'West Coast Paradise',
      img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1000&q=80',
      season: 'October to April',
      duration: '4-7 Days',
      highlights: ['Calangute & Vagator Sunsets', 'Old Goa Portuguese Cathedrals', 'Spice Plantation Dining', 'Private Mandovi River Sunset Catamaran'],
      inr: 28000,
      desc: 'Golden sandy beaches flanked by swaying palms, colorful 16th-century Latin Quarter heritage villas in Fontainhas, and relaxed seaside susegad living.'
    },
    kashmir: {
      name: 'Kashmir',
      eyebrow: 'Paradise on Earth',
      img: 'https://www.worldatlas.com/upload/70/33/ab/shutterstock-115227475.jpg',
      season: 'March to October (Summer) / Dec to Feb (Snow)',
      duration: '6-8 Days',
      highlights: ['Dal Lake Cedar Wood Houseboat Stay', 'Gulmarg Gondola Ride Phase 2', 'Pahalgam Betaab & Aru Valleys', 'Saffron & Walnut Orchard Walks'],
      inr: 42000,
      desc: 'Snow-capped Pir Panjal peaks reflected in mirror-still lakes, timeless Shikara rides at dawn, fragrant pine forests, and alpine meadow serenity.'
    },
    manali: {
      name: 'Manali & Solang',
      eyebrow: 'Himachal Valley of Gods',
      img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1000&q=80',
      season: 'Year-Round (Snow: Dec-Feb)',
      duration: '5-6 Days',
      highlights: ['Atal Tunnel & Sissu Waterfall', 'Old Manali Apple Orchard Cafes', 'Solang Valley Paragliding', 'Rohtang Pass Snow Panorama'],
      inr: 24000,
      desc: 'Crisp mountain air, bubbling Beas river waters, wooden pagoda architecture of Hadimba Temple, and majestic snow peaks bordering the Lahaul valley.'
    },
    kerala: {
      name: 'Kerala Backwaters & Munnar',
      eyebrow: 'God\'s Own Country',
      img: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1000&q=80',
      season: 'September to March',
      duration: '5-7 Days',
      highlights: ['Private Kettuvallam Houseboat Cruise', 'Munnar Tea Garden Misty Walks', 'Thekkady Periyar Wildlife Safari', 'Traditional Kathakali & Ayurvedic Spa'],
      inr: 34000,
      desc: 'Lush green emerald waterways, swaying coconut canopies, mist-shrouded tea plantations, and authentic Kerala spice gastronomy.'
    },
    ladakh: {
      name: 'Ladakh & Pangong Tso',
      eyebrow: 'The Land of High Passes',
      img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1000&q=80',
      season: 'May to September',
      duration: '7-9 Days',
      highlights: ['Color-Changing Pangong Tso Lake', 'Nubra Valley Double-Humped Camel Ride', 'Khardung La High Altitude Pass (17,582 ft)', 'Thiksey & Hemis Ancient Monasteries'],
      inr: 48000,
      desc: 'Vast moonscape valleys, prayer flags fluttering against cobalt skies, high-altitude alpine lakes, and profound spiritual calm.'
    },
    andaman: {
      name: 'Andaman & Nicobar Islands',
      eyebrow: 'Tropical Azure Wilderness',
      img: 'https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?auto=format&fit=crop&w=1000&q=80',
      season: 'October to May',
      duration: '6-8 Days',
      highlights: ['Radhanagar Beach Sunset Walk', 'Elephant Beach Scuba & Snorkeling', 'Cellular Jail Historic Light & Sound', 'Neil Island Coral Bridge & Tide Pools'],
      inr: 52000,
      desc: 'Turquoise transparent waters, untouched virgin white sand shores, vibrant living coral reefs, and tranquil tropical island isolation.'
    },
    jaipur: {
      name: 'Jaipur & Udaipur',
      eyebrow: 'Royal Heritage of Rajasthan',
      img: 'https://static.vecteezy.com/system/resources/previews/003/153/081/non_2x/jaipur-city-palace-in-jaipur-city-free-photo.jpg',
      season: 'October to March',
      duration: '5-7 Days',
      highlights: ['Amber Fort Elephant Path & Sheesh Mahal', 'Lake Pichola Sunset Boat to Jagmandir', 'Hawa Mahal & Johari Bazaar Gems', 'Grand Heritage Palace Dinner'],
      inr: 36000,
      desc: 'Opulent royal palaces, sandstone battlements, kaleidoscopic textile bazaars, and regal hospitality perfected over centuries.'
    },
    kutch: {
      name: 'Rann of Kutch',
      eyebrow: 'White Salt Desert Splendor',
      img: 'https://images.unsplash.com/photo-1587922546307-776227941871?auto=format&fit=crop&w=1000&q=80',
      season: 'November to February (Rann Utsav)',
      duration: '3-5 Days',
      highlights: ['White Desert Full Moon Stargazing', 'Dhordo Luxury Tent City Living', 'Kala Dungar Highest Point Vista', 'Artisanal Rogan Art & Kutchi Embroidery'],
      inr: 22000,
      desc: 'An endless gleaming sea of white salt crystals extending to the horizon, vibrant folk music under glittering desert starlight, and rich artisan heritage.'
    }
  };

  function initDestinationModal() {
    let modal = document.getElementById('destQuickModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'destQuickModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 720px; padding: 0; overflow: hidden;">
          <button class="modal-close-btn" id="closeDestModal" style="top: 16px; right: 16px; z-index: 10;">&times;</button>
          <div style="height: 280px; position: relative;">
            <img id="destModalImg" src="" alt="" style="width: 100%; height: 100%; object-fit: cover;">
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(15,23,42,0.85) 100%);"></div>
            <div style="position: absolute; bottom: 20px; left: 24px; right: 24px; color: #fff;">
              <span id="destModalEyebrow" class="badge badge-gold" style="margin-bottom: 8px;"></span>
              <h3 id="destModalTitle" style="font-size: 32px; color: #fff;"></h3>
            </div>
          </div>
          <div style="padding: 32px;">
            <p id="destModalDesc" style="color: var(--text-soft); font-size: 15px; line-height: 1.7; margin-bottom: 20px;"></p>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; background: var(--bg-section); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border);">
              <div>
                <span style="font-family: var(--mono); font-size: 11px; color: var(--text-soft); text-transform: uppercase;">Best Season:</span>
                <div id="destModalSeason" style="font-weight: 600; font-size: 14px; margin-top: 2px;"></div>
              </div>
              <div>
                <span style="font-family: var(--mono); font-size: 11px; color: var(--text-soft); text-transform: uppercase;">Recommended Duration:</span>
                <div id="destModalDuration" style="font-weight: 600; font-size: 14px; margin-top: 2px;"></div>
              </div>
            </div>
            <div style="margin-bottom: 24px;">
              <h4 style="font-size: 16px; margin-bottom: 10px;">Top Curated Highlights:</h4>
              <ul id="destModalHighlights" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13.5px; color: var(--text-soft);"></ul>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 20px;">
              <div>
                <span style="font-size: 12px; color: var(--text-soft);">Starting From</span>
                <div id="destModalPrice" style="font-family: var(--display); font-size: 26px; font-weight: 600; color: var(--ocean);"></div>
              </div>
              <div style="display: flex; gap: 10px;">
                <button type="button" class="btn btn-ghost btn-sm" id="destModalExplorePackages">View Packages</button>
                <button type="button" class="btn btn-primary btn-sm" id="destModalBookTrip">Book This Trip</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#closeDestModal').addEventListener('click', () => modal.classList.remove('active'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });

      modal.querySelector('#destModalBookTrip').addEventListener('click', () => {
        modal.classList.remove('active');
        const title = modal.querySelector('#destModalTitle').textContent;
        openBookingModal(null, title);
      });

      modal.querySelector('#destModalExplorePackages').addEventListener('click', () => {
        window.location.href = 'packages.html';
      });
    }
  }

  function openDestinationModal(destKey) {
    initDestinationModal();
    const data = DESTINATIONS_DATA[destKey.toLowerCase()];
    if (!data) return;

    const modal = document.getElementById('destQuickModal');
    modal.querySelector('#destModalImg').src = data.img;
    modal.querySelector('#destModalTitle').textContent = data.name;
    modal.querySelector('#destModalEyebrow').textContent = data.eyebrow;
    modal.querySelector('#destModalDesc').textContent = data.desc;
    modal.querySelector('#destModalSeason').textContent = data.season;
    modal.querySelector('#destModalDuration').textContent = data.duration;
    modal.querySelector('#destModalPrice').textContent = formatPrice(data.inr) + ' / person';

    const ul = modal.querySelector('#destModalHighlights');
    ul.innerHTML = data.highlights.map(h => `<li style="display:flex;align-items:center;gap:6px;"><span style="color:var(--mint);">✓</span> ${h}</li>`).join('');

    modal.classList.add('active');
  }

  // --- Mobile Drawer & Header Scroll Effects ---
  function initNav() {
    const header = document.getElementById('siteHeader');
    if (header) {
      window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 30);
      });
    }

    const burger = document.getElementById('burgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (burger && mobileMenu) {
      burger.addEventListener('click', () => {
        burger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
      });

      mobileMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          burger.classList.remove('open');
          mobileMenu.classList.remove('open');
        });
      });
    }
  }

  // --- Scroll Reveal Animations ---
  function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(el => io.observe(el));
  }

  // --- Newsletter Form Listener ---
  function initNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        if (input && input.value) {
          const btn = form.querySelector('button');
          const originalText = btn.textContent;
          btn.textContent = 'Subscribing...';
          btn.disabled = true;

          setTimeout(() => {
            btn.textContent = 'Subscribed ✓';
            showToast('Thank you for subscribing to WanderNest journeys!', 'success');
            input.value = '';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.disabled = false;
            }, 3000);
          }, 600);
        }
      });
    });
  }

  // --- FAQ Accordions ---
  function initFAQ() {
    document.querySelectorAll('.faq-question, .faq-question-neu').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item, .faq-item-neu');
        if (item) {
          const isActive = item.classList.contains('active');
          document.querySelectorAll('.faq-item, .faq-item-neu').forEach(i => i.classList.remove('active'));
          if (!isActive) item.classList.add('active');
        }
      });
    });
  }

  // --- Logo-Themed Loading Animation (First Visit & Refresh Only) ---
  let preloaderInitialized = false;
  function initPreloader() {
    if (preloaderInitialized) return;
    preloaderInitialized = true;

    const preloader = document.getElementById('sitePreloader');
    if (!preloader) return;

    // If skip-preloader was flagged in <head> during internal page switch, remove instantly
    if (document.documentElement.classList.contains('skip-preloader')) {
      preloader.remove();
      return;
    }

    // Mark as visited in this browser session
    try {
      sessionStorage.setItem('mitali_visited', 'true');
    } catch (e) {}

    // Lock page scroll while preloader is active
    document.body.classList.add('preloader-active');

    const barFill = preloader.querySelector('.preloader-bar-fill');
    const counter = preloader.querySelector('.preloader-counter');

    let startTime = null;
    const duration = 1350; // Smooth ~1.35s luxury progress

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const percent = Math.min(100, Math.floor(eased * 100));

      if (barFill) barFill.style.width = percent + '%';
      if (counter) counter.textContent = percent + '%';

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (barFill) barFill.style.width = '100%';
        if (counter) counter.textContent = '100%';

        setTimeout(() => {
          preloader.classList.add('fade-out');
          document.body.classList.remove('preloader-active');
          setTimeout(() => {
            if (preloader.parentNode) preloader.remove();
          }, 550);
        }, 220);
      }
    }

    requestAnimationFrame(step);
  }

  // --- Global Initializer ---
  function init() {
    initPreloader();
    setupCurrencySwitcher();
    updateWishlistBadges();
    setupWishlistButtons();
    initNav();
    initScrollReveal();
    initNewsletter();
    initFAQ();
    initBookingModal();

    // Hook up all "Plan My Trip" / "Book Now" buttons
    document.querySelectorAll('.open-booking-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const pkgId = btn.getAttribute('data-package-id');
        const pkgTitle = btn.getAttribute('data-package-title');
        openBookingModal(pkgId, pkgTitle);
      });
    });

    // Hook up destination clickers
    document.querySelectorAll('[data-dest-modal]').forEach(el => {
      el.addEventListener('click', () => {
        const destKey = el.getAttribute('data-dest-modal');
        if (destKey) openDestinationModal(destKey);
      });
    });
  }

  // Expose useful utilities globally
  window.WanderNest = {
    openBookingModal,
    openDestinationModal,
    showToast,
    formatPrice,
    getWishlist,
    toggleWishlistItem,
    updateWishlistBadges
  };

  // Kick off preloader immediately if DOM already parsed the preloader element
  if (document.getElementById('sitePreloader')) {
    initPreloader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
