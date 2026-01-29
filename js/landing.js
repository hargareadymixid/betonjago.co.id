// ===================================
// LANDING PAGE JAVASCRIPT - UPDATED WITH ENHANCED FORM
// ===================================

// Global Variables
let currentStepNum = 1;
let selectedProduct = '';
let selectedPrice = 0;
let selectedPumpPrice = 0;

// ===================================
// ENHANCED PRICING & PROMO SYSTEM
// ===================================

let promoActive = true;  // Diskon aktif hari ini
let promoPercentage = 5;

// Fake Order Data
const fakeOrders = [
  { name: "Pak Budi", location: "Cakung", product: "K250", volume: "5 m³", time: "2 menit yang lalu" },
  { name: "Bu Siti", location: "Matraman", product: "K225", volume: "3 m³", time: "5 menit yang lalu" },
  { name: "Pak Joko", location: "Kramat Jati", product: "K300", volume: "7 m³", time: "8 menit yang lalu" },
  { name: "Pak Andi", location: "Pulo Gadung", product: "K250", volume: "4 m³", time: "12 menit yang lalu" },
  { name: "Bu Rina", location: "Jatinegara", product: "K225", volume: "6 m³", time: "15 menit yang lalu" },
  { name: "Pak Hendra", location: "Duren Sawit", product: "K300", volume: "8 m³", time: "18 menit yang lalu" },
  { name: "Bu Dewi", location: "Cipayung", product: "K250", volume: "5 m³", time: "22 menit yang lalu" },
  { name: "Pak Agus", location: "Pasar Rebo", product: "K225", volume: "4 m³", time: "25 menit yang lalu" },
  { name: "Bu Maya", location: "Makasar", product: "K300", volume: "6 m³", time: "30 menit yang lalu" },
  { name: "Pak Rudi", location: "Ciracas", product: "K250", volume: "7 m³", time: "35 menit yang lalu" }
];

let notificationInterval;
let currentNotificationIndex = 0;

// ===================================
// COUNTDOWN TIMER FUNCTIONALITY
// ===================================

let countdownInterval;

function initializeCountdownTimer() {
  updateCountdownDisplay();
  
  // Update countdown setiap detik
  countdownInterval = setInterval(() => {
    updateCountdownDisplay();
  }, 1000);
}

function getTimeRemaining() {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const timeRemaining = endOfDay - now;
  
  if (timeRemaining <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  
  const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
  const seconds = Math.floor((timeRemaining / 1000) % 60);
  
  return { hours, minutes, seconds, expired: false };
}

function updateCountdownDisplay() {
  const time = getTimeRemaining();
  
  // Format dengan leading zero
  const formattedTime = `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`;
  
  // Update semua elemen countdown
  const countdownElements = document.querySelectorAll('[data-countdown]');
  countdownElements.forEach(el => {
    el.textContent = formattedTime;
  });
  
  // Update promo banner jika ada
  const promoBanner = document.querySelector('.promo-banner');
  if (promoBanner && time.expired) {
    promoBanner.style.opacity = '0.5';
    const badge = promoBanner.querySelector('.promo-badge');
    if (badge) {
      badge.textContent = '⏰ PROMO TELAH BERAKHIR';
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeDatePicker();
  initializeEventListeners();
  initializeFAQToggles();
  initializeAnalytics();
  initializeFakeOrderNotifications();
  initializeMutuSelector();
  initializePumpSelector();
  initializePricing();
  displayPromoLabel();
  initializeCountdownTimer();  // ADD THIS
});

// ===================================
// FAKE ORDER NOTIFICATIONS
// ===================================

function initializeFakeOrderNotifications() {
  createNotificationElement();
  
  setTimeout(() => {
    showFakeOrderNotification();
    
    notificationInterval = setInterval(() => {
      showFakeOrderNotification();
    }, getRandomInterval(15000, 25000));
    
  }, 5000);
}

function createNotificationElement() {
  const notification = document.createElement('div');
  notification.className = 'order-notification';
  notification.id = 'orderNotification';
  notification.innerHTML = `
    <div class="order-notification-icon">✓</div>
    <div class="order-notification-content">
      <strong id="notificationText"></strong>
      <p id="notificationDetails"></p>
      <span class="order-notification-time" id="notificationTime"></span>
    </div>
    <button class="order-notification-close" onclick="hideNotification()">×</button>
  `;
  document.body.appendChild(notification);
}

function showFakeOrderNotification() {
  const notification = document.getElementById('orderNotification');
  if (!notification) return;
  
  const order = fakeOrders[currentNotificationIndex];
  currentNotificationIndex = (currentNotificationIndex + 1) % fakeOrders.length;
  
  document.getElementById('notificationText').textContent = 
    `${order.name} dari ${order.location}`;
  document.getElementById('notificationDetails').textContent = 
    `Baru saja memesan ${order.product} - ${order.volume}`;
  document.getElementById('notificationTime').textContent = order.time;
  
  notification.classList.add('show');
  
  setTimeout(() => {
    hideNotification();
  }, 7000);
}

function hideNotification() {
  const notification = document.getElementById('orderNotification');
  if (notification) {
    notification.classList.remove('show');
  }
}

function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===================================
// MUTU & PUMP SELECTOR
// ===================================

function initializeMutuSelector() {
  const mutuSelect = document.getElementById('inputMutu');
  if (mutuSelect) {
    mutuSelect.addEventListener('change', function() {
      const selectedOption = this.options[this.selectedIndex];
      selectedProduct = this.value;
      
      let basePrice = parseInt(selectedOption.dataset.price) || 0;
      
      if (promoActive) {
        selectedPrice = Math.round(basePrice * (1 - promoPercentage / 100));
      } else {
        selectedPrice = basePrice;
      }
      
      updatePriceDisplay(this, basePrice, selectedPrice);
    });
  }
}

function updatePriceDisplay(selectElement, basePrice, promoPrice) {
  const option = selectElement.options[selectElement.selectedIndex];
  
  option.dataset.originalPrice = basePrice;
  option.dataset.promoPrice = promoPrice;
}

function initializePumpSelector() {
  const pumpSelect = document.getElementById('inputPompa');
  if (pumpSelect) {
    pumpSelect.addEventListener('change', function() {
      const selectedOption = this.options[this.selectedIndex];
      selectedPumpPrice = parseInt(selectedOption.dataset.price) || 0;
    });
  }
}

function displayPromoLabel() {
  const promoElements = document.querySelectorAll('.promo-label, [data-promo]');
  promoElements.forEach(el => {
    if (promoActive) {
      el.style.display = 'block';
    }
  });
}

// ===================================
// DATE PICKER INITIALIZATION
// ===================================
function initializeDatePicker() {
  const dateInput = document.getElementById('inputTanggal');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }
}

// ===================================
// EVENT LISTENERS
// ===================================
function initializeEventListeners() {
  const openFormBtn = document.getElementById('openFormBtn');
  const openFormBtnFinal = document.getElementById('openFormBtnFinal');
  
  if (openFormBtn) {
    openFormBtn.addEventListener('click', openForm);
  }
  
  if (openFormBtnFinal) {
    openFormBtnFinal.addEventListener('click', openForm);
  }
  
  const closeModal = document.querySelector('.close-modal');
  if (closeModal) {
    closeModal.addEventListener('click', closeFormModal);
  }
  
  window.addEventListener('click', handleOutsideClick);
}

// ===================================
// FORM MODAL FUNCTIONS
// ===================================

function openForm() {
  const modal = document.getElementById('formModal');
  if (modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    resetForm();
  }
}

function openFormWithProduct(product, price) {
  selectedProduct = product;
  selectedPrice = parseInt(price);
  openForm();
  
  const mutuSelect = document.getElementById('inputMutu');
  if (mutuSelect) {
    mutuSelect.value = product;
  }
}

function closeFormModal() {
  const modal = document.getElementById('formModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

function handleOutsideClick(event) {
  const modal = document.getElementById('formModal');
  if (event.target === modal) {
    closeFormModal();
  }
}

function resetForm() {
  currentStepNum = 1;
  
  document.querySelectorAll('.form-step').forEach(step => {
    step.classList.remove('active');
  });
  
  const firstStep = document.getElementById('step1');
  if (firstStep) {
    firstStep.classList.add('active');
  }
  
  updateProgress();
  clearFormInputs();
}

function clearFormInputs() {
  const inputs = [
    'inputNama',
    'inputVolume',
    'inputTanggal',
    'inputAlamatDetail'
  ];
  
  inputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.value = '';
    }
  });
  
  const selects = ['inputMutu', 'inputKelurahan', 'inputWaktu', 'inputPompa'];
  selects.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.selectedIndex = 0;
    }
  });
  
  const timeInput = document.getElementById('inputWaktu');
  if (timeInput) {
    timeInput.value = '08:00';
  }
}

// ===================================
// PROGRESS BAR
// ===================================
function updateProgress() {
  const progress = (currentStepNum / 6) * 100;
  const progressFill = document.getElementById('progressFill');
  const currentStepSpan = document.getElementById('currentStep');
  
  if (progressFill) {
    progressFill.style.width = progress + '%';
  }
  
  if (currentStepSpan) {
    currentStepSpan.textContent = currentStepNum;
  }
}

// ===================================
// STEP NAVIGATION
// ===================================

function nextStep(step) {
  if (!validateStep(step)) {
    return;
  }
  
  const currentStep = document.getElementById('step' + step);
  if (currentStep) {
    currentStep.classList.remove('active');
  }
  
  currentStepNum = step + 1;
  const nextStepElement = document.getElementById('step' + currentStepNum);
  if (nextStepElement) {
    nextStepElement.classList.add('active');
  }
  
  updateProgress();
  
  if (currentStepNum === 6) {
    showSummary();
  }
}

function prevStep(step) {
  const currentStep = document.getElementById('step' + step);
  if (currentStep) {
    currentStep.classList.remove('active');
  }
  
  currentStepNum = step - 1;
  const prevStepElement = document.getElementById('step' + currentStepNum);
  if (prevStepElement) {
    prevStepElement.classList.add('active');
  }
  
  updateProgress();
}

// ===================================
// VALIDATION
// ===================================
function validateStep(step) {
  switch(step) {
    case 1:
      return validateName();
    case 2:
      return validateMutu();
    case 3:
      return validateLocation();
    case 4:
      return validateVolume();
    case 5:
      return validateDateTime();
    default:
      return true;
  }
}

function validateName() {
  const nama = document.getElementById('inputNama');
  if (!nama || !nama.value.trim()) {
    showAlert('Mohon isi nama lengkap Anda');
    return false;
  }
  return true;
}

function validateMutu() {
  const mutu = document.getElementById('inputMutu');
  if (!mutu || !mutu.value) {
    showAlert('Mohon pilih mutu beton yang Anda butuhkan');
    return false;
  }
  
  const selectedOption = mutu.options[mutu.selectedIndex];
  selectedProduct = mutu.value;
  let basePrice = parseInt(selectedOption.dataset.price) || 0;
  
  if (promoActive) {
    selectedPrice = Math.round(basePrice * (1 - promoPercentage / 100));
  } else {
    selectedPrice = basePrice;
  }
  
  return true;
}

function validateLocation() {
  const kelurahan = document.getElementById('inputKelurahan');
  if (!kelurahan || !kelurahan.value) {
    showAlert('Mohon pilih kelurahan lokasi pengecoran');
    return false;
  }
  return true;
}

function validateVolume() {
  const volume = document.getElementById('inputVolume');
  if (!volume || !volume.value || parseFloat(volume.value) <= 0) {
    showAlert('Mohon isi volume yang valid');
    return false;
  }
  
  const volumeValue = parseFloat(volume.value);
  if (volumeValue < 3) {
    const confirm = window.confirm(
      'Minimal pemesanan adalah 3 m³. Volume Anda ' + volumeValue + ' m³.\n\n' +
      'Tetap lanjutkan? Tim kami akan menghubungi Anda untuk konfirmasi.'
    );
    return confirm;
  }
  
  return true;
}

function validateDateTime() {
  const tanggal = document.getElementById('inputTanggal');
  const waktu = document.getElementById('inputWaktu');
  
  if (!tanggal || !tanggal.value) {
    showAlert('Mohon pilih tanggal pengecoran');
    return false;
  }
  
  if (!waktu || !waktu.value) {
    showAlert('Mohon pilih waktu pengecoran');
    return false;
  }
  
  return true;
}

function showAlert(message) {
  alert(message);
}

// ===================================
// SUMMARY DISPLAY
// ===================================
function showSummary() {
  const nama = document.getElementById('inputNama').value;
  const mutu = document.getElementById('inputMutu');
  const mutuText = mutu.options[mutu.selectedIndex].text;
  const kelurahan = document.getElementById('inputKelurahan').value;
  const alamatDetail = document.getElementById('inputAlamatDetail').value;
  const volume = document.getElementById('inputVolume').value;
  const tanggal = document.getElementById('inputTanggal').value;
  const waktu = document.getElementById('inputWaktu');
  const waktuText = waktu.options[waktu.selectedIndex].text;
  const pompa = document.getElementById('inputPompa');
  const pompaText = pompa.options[pompa.selectedIndex].text;
  
  selectedPumpPrice = parseInt(pompa.options[pompa.selectedIndex].dataset.price) || 0;
  
  updateSummaryField('summaryNama', nama);
  updateSummaryField('summaryMutu', mutuText);
  
  const lokasiLengkap = kelurahan + (alamatDetail ? ', ' + alamatDetail : '');
  updateSummaryField('summaryLokasi', lokasiLengkap);
  
  updateSummaryField('summaryVolume', volume + ' m³');
  
  const formattedDateTime = formatDateTime(tanggal, waktu.value);
  updateSummaryField('summaryWaktu', formattedDateTime);
  
  updateSummaryField('summaryPompa', pompaText);
  
  // Calculate price with HTML formatting
  const totalPrice = calculateTotalPrice(volume);
  updateSummaryField('summaryHarga', totalPrice);
}

function updateSummaryField(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    // Cek apakah value berisi HTML (dari calculateTotalPrice)
    if (value.includes('<')) {
      element.innerHTML = value;
    } else {
      element.textContent = value;
    }
  }
}

function formatDateTime(tanggal, waktu) {
  try {
    const dateObj = new Date(tanggal);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const formattedDate = dateObj.toLocaleDateString('id-ID', options);
    return `${formattedDate}, Pukul ${waktu}`;
  } catch (error) {
    return `${tanggal}, Pukul ${waktu}`;
  }
}

function calculateTotalPrice(volume) {
  if (!selectedPrice || !volume) {
    return 'Hubungi kami untuk harga terbaik';
  }
  
  const volumeNum = parseFloat(volume);
  
  // Hitung harga original (sebelum markup 5%)
  const originalPricePerM3 = Math.round(selectedPrice / (1 - promoPercentage / 100));
  
  // Hitung total
  const originalTotal = originalPricePerM3 * volumeNum;
  const discountedTotal = selectedPrice * volumeNum;
  const pumpTotal = selectedPumpPrice;
  const finalTotal = discountedTotal + pumpTotal;
  const savings = originalTotal - discountedTotal;
  
  // Update savings display
  const savingsEl = document.getElementById('savingsAmount');
  if (savingsEl) {
    savingsEl.textContent = 'Rp ' + savings.toLocaleString('id-ID');
    savingsEl.style.display = 'block';
  }
  
  // Build price text dengan format yang lebih jelas
  let priceText = `<div class="price-breakdown">`;
  
  // Original price
  priceText += `<div class="price-row original-price-row">
    <span>Harga Normal:</span>
    <span class="price-strikethrough">Rp ${originalTotal.toLocaleString('id-ID')}</span>
  </div>`;
  
  // Discount info
  priceText += `<div class="price-row discount-row">
    <span>Diskon Hari Ini:</span>
    <span class="discount-percent">-${promoPercentage}% = -Rp ${savings.toLocaleString('id-ID')}</span>
  </div>`;
  
  // Beton price after discount
  priceText += `<div class="price-row beton-price-row">
    <span>Harga Beton (Setelah Diskon):</span>
    <span class="final-price">Rp ${discountedTotal.toLocaleString('id-ID')}</span>
  </div>`;
  
  // Pump price if selected
  if (pumpTotal > 0) {
    priceText += `<div class="price-row pump-price-row">
      <span>Harga Pompa Beton:</span>
      <span class="final-price">Rp ${pumpTotal.toLocaleString('id-ID')}</span>
    </div>`;
  }
  
  // Grand total
  priceText += `<div class="price-row total-price-row">
    <span><strong>TOTAL HARGA FINAL:</strong></span>
    <span class="grand-total">Rp ${finalTotal.toLocaleString('id-ID')}</span>
  </div>`;
  
  priceText += `</div>`;
  
  return priceText;
}

// ===================================
// WHATSAPP SUBMISSION
// ===================================
function submitToWhatsApp() {
  const formData = collectFormData();
  const message = createWhatsAppMessage(formData);
  const whatsappURL = generateWhatsAppURL(message);
  
  window.open(whatsappURL, '_blank');
  
  closeFormModal();
  
  showThankYouMessage();
  
  trackConversion('whatsapp_submission');
}

function collectFormData() {
  const mutu = document.getElementById('inputMutu');
  const kelurahan = document.getElementById('inputKelurahan');
  const waktu = document.getElementById('inputWaktu');
  const pompa = document.getElementById('inputPompa');
  
  return {
    nama: document.getElementById('inputNama').value,
    mutu: mutu.options[mutu.selectedIndex].text,
    kelurahan: kelurahan.value,
    alamatDetail: document.getElementById('inputAlamatDetail').value,
    volume: document.getElementById('inputVolume').value,
    tanggal: document.getElementById('inputTanggal').value,
    waktu: waktu.value,
    waktuText: waktu.options[waktu.selectedIndex].text,
    pompa: pompa.options[pompa.selectedIndex].text,
    pompaPrice: selectedPumpPrice,
    betonPrice: selectedPrice
  };
}

function createWhatsAppMessage(data) {
  const formattedDate = formatDateForWhatsApp(data.tanggal);
  const lokasiLengkap = data.kelurahan + (data.alamatDetail ? ', ' + data.alamatDetail : '');
  
  let message = `*🎯 PESANAN BETON READYMIX*%0A`;
  message += `================================%0A%0A`;
  
  message += `*👤 Data Order:*%0A`;
  message += `Nama: ${data.nama}%0A%0A`;
  
  message += `*🏗️ Detail Pesanan:*%0A`;
  message += `Mutu Beton: ${data.mutu}%0A`;
  message += `Volume: ${data.volume} m³%0A`;
  message += `Lokasi: ${lokasiLengkap}%0A%0A`;
  
  message += `*📅 Jadwal Pengecoran:*%0A`;
  message += `Tanggal: ${formattedDate}%0A`;
  message += `Waktu: ${data.waktuText}%0A%0A`;
  
  message += `*🚚 Concrete Pump:*%0A`;
  message += `${data.pompa}%0A%0A`;
  
  message += `*💰 Estimasi Harga:*%0A`;
  if (data.betonPrice && data.volume) {
    const betonTotal = data.betonPrice * parseFloat(data.volume);
    message += `Beton: Rp ${betonTotal.toLocaleString('id-ID')}%0A`;
    
    if (data.pompaPrice > 0) {
      message += `Pompa: Rp ${data.pompaPrice.toLocaleString('id-ID')}%0A`;
      const grandTotal = betonTotal + data.pompaPrice;
      message += `*Total: Rp ${grandTotal.toLocaleString('id-ID')}*%0A`;
    } else {
      message += `*Total: Rp ${betonTotal.toLocaleString('id-ID')}*%0A`;
    }
  } else {
    message += `Mohon konfirmasi harga%0A`;
  }
  
  message += `%0A================================%0A`;
  message += `_Pesanan dari Betonjago.co.id_`;
  
  return message;
}

function formatDateForWhatsApp(tanggal) {
  try {
    const dateObj = new Date(tanggal);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return dateObj.toLocaleDateString('id-ID', options);
  } catch (error) {
    return tanggal;
  }
}

function generateWhatsAppURL(message) {
  const phoneNumber = '6281294354959';
  return `https://wa.me/${phoneNumber}?text=${message}`;
}

function showThankYouMessage() {
  setTimeout(() => {
    alert('✅ Terima kasih!\n\nAnda akan diarahkan ke WhatsApp.\nTim kami akan segera merespons dan memberikan penawaran terbaik untuk Anda.');
  }, 500);
}

// ===================================
// FAQ TOGGLES
// ===================================
function initializeFAQToggles() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', function() {
      const faqItem = this.parentElement;
      const isActive = faqItem.classList.contains('active');
      
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });
}

// ===================================
// ANALYTICS TRACKING
// ===================================
function initializeAnalytics() {
  trackWhatsAppClicks();
  trackProductSelections();
  trackFormInteractions();
}

function trackWhatsAppClicks() {
  const whatsappElements = document.querySelectorAll('a[href*="wa.me"], button[onclick*="WhatsApp"]');
  
  whatsappElements.forEach(element => {
    element.addEventListener('click', function() {
      trackEvent('whatsapp_click', {
        element: this.tagName,
        text: this.textContent.trim()
      });
    });
  });
}

function trackProductSelections() {
  const productButtons = document.querySelectorAll('.product-cta');
  
  productButtons.forEach(button => {
    button.addEventListener('click', function() {
      const productOption = this.closest('.product-option');
      const productName = productOption ? productOption.dataset.product : 'unknown';
      
      trackEvent('product_selected', {
        product: productName
      });
    });
  });
}

function trackFormInteractions() {
  const formInputs = document.querySelectorAll('#formModal input, #formModal select, #formModal textarea');
  
  formInputs.forEach(input => {
    input.addEventListener('focus', function() {
      trackEvent('form_field_focus', {
        field: this.id || this.name
      });
    });
  });
}

function trackEvent(eventName, eventData) {
  console.log('Event tracked:', eventName, eventData);
  
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, eventData);
  }
  
  if (typeof fbq !== 'undefined') {
    fbq('track', eventName, eventData);
  }
}

function trackConversion(conversionType) {
  trackEvent('conversion', {
    type: conversionType
  });
  
  if (typeof gtag !== 'undefined') {
    gtag('event', 'conversion', {
      'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL',
      'value': selectedPrice || 0,
      'currency': 'IDR'
    });
  }
  
  if (typeof fbq !== 'undefined') {
    fbq('track', 'Lead', {
      value: (selectedPrice || 0) + selectedPumpPrice,
      currency: 'IDR'
    });
  }
}

// ===================================
// EXPORT FUNCTIONS
// ===================================
window.openForm = openForm;
window.openFormWithProduct = openFormWithProduct;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitToWhatsApp = submitToWhatsApp;
window.hideNotification = hideNotification;