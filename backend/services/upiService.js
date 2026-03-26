class UPIService {
  constructor() {
    // Merchant UPI ID patterns for different providers
    this.merchantPatterns = {
      phonepe: {
        pattern: '@yblbiz',
        bankName: 'PhonePe Business',
        example: 'yourbusiness@yblbiz'
      },
      paytm: {
        pattern: '@paytmpaymentsbank',
        bankName: 'Paytm Payments Bank',
        example: 'yourbusiness@paytmpaymentsbank'
      },
      googlepay: {
        pattern: '@okaxisbiz',
        bankName: 'Axis Bank Business',
        example: 'yourbusiness@okaxisbiz'
      },
      bhim: {
        pattern: '@upi',
        bankName: 'BHIM',
        example: 'yourbusiness@upi'
      },
      icici: {
        pattern: '@icicibiz',
        bankName: 'ICICI Bank Business',
        example: 'yourbusiness@icicibiz'
      }
    };
  }

  // Check if UPI ID is merchant type
  isMerchantUpi(upiId) {
    const merchantPatterns = Object.values(this.merchantPatterns);
    return merchantPatterns.some(pattern => upiId.includes(pattern.pattern));
  }

  // Get UPI provider and type
  getUpiInfo(upiId) {
    for (const [provider, info] of Object.entries(this.merchantPatterns)) {
      if (upiId.includes(info.pattern)) {
        return {
          type: 'merchant',
          provider: provider,
          bankName: info.bankName,
          pattern: info.pattern
        };
      }
    }
    
    // Check if it's personal UPI (common patterns)
    const personalPatterns = ['@ybl', '@okaxis', '@okhdfc', '@okicici', '@ibl', '@paytm'];
    const isPersonal = personalPatterns.some(pattern => upiId.includes(pattern));
    
    return {
      type: isPersonal ? 'personal' : 'unknown',
      provider: 'unknown',
      bankName: 'Unknown',
      pattern: null
    };
  }

  // Generate UPI payment link with proper parameters
  generateUpiLink(upiId, amount, orderId, merchantName, note = '') {
    const upiInfo = this.getUpiInfo(upiId);
    
    // Use merchant UPI if available, otherwise fallback to personal
    const effectiveUpiId = upiId;
    
    // Build UPI URL with proper parameters
    const params = new URLSearchParams({
      pa: effectiveUpiId, // Payee address
      pn: merchantName || 'UniVerse Food', // Payee name
      am: amount.toString(), // Amount
      cu: 'INR', // Currency
      tn: note || `Payment for Order #${orderId}`, // Transaction note
      tr: orderId, // Transaction reference
      mc: '5311', // Merchant category code (Restaurants)
      url: `${process.env.FRONTEND_URL || 'https://universeorder.co.in'}/order-tracker/${orderId}` // Callback URL
    });

    // Add merchant-specific parameters for business UPI
    if (upiInfo.type === 'merchant') {
      params.append('mode', '02'); // UPI mode for merchant
      params.append('purpose', '00'); // General purpose
    }

    return `upi://pay?${params.toString()}`;
  }

  // Generate QR code data for UPI
  generateUpiQrData(upiId, amount, orderId, merchantName, note = '') {
    const upiLink = this.generateUpiLink(upiId, amount, orderId, merchantName, note);
    return upiLink.replace('upi://pay?', '');
  }

  // Validate UPI ID format
  validateUpiId(upiId) {
    if (!upiId || typeof upiId !== 'string') {
      return { valid: false, error: 'UPI ID is required' };
    }

    // Basic UPI ID validation
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    if (!upiRegex.test(upiId)) {
      return { valid: false, error: 'Invalid UPI ID format' };
    }

    const upiInfo = this.getUpiInfo(upiId);
    
    return {
      valid: true,
      type: upiInfo.type,
      provider: upiInfo.provider,
      bankName: upiInfo.bankName,
      warning: upiInfo.type === 'personal' ? 'Personal UPI IDs may face transaction limits and risk warnings' : null
    };
  }

  // Get recommended merchant UPI providers
  getRecommendedProviders() {
    return [
      {
        name: 'PhonePe Business',
        upiPattern: '@yblbiz',
        benefits: ['No transaction limits', 'Instant settlements', 'Business branding'],
        setupLink: 'https://business.phonepe.com/',
        difficulty: 'Easy',
        timeToSetup: '5-10 minutes'
      },
      {
        name: 'Paytm Business',
        upiPattern: '@paytmpaymentsbank',
        benefits: ['Wide acceptance', 'Quick setup', 'Business analytics'],
        setupLink: 'https://business.paytm.com/',
        difficulty: 'Easy',
        timeToSetup: '5-10 minutes'
      },
      {
        name: 'Google Pay for Business',
        upiPattern: '@okaxisbiz',
        benefits: ['Google integration', 'Business insights', 'No fees'],
        setupLink: 'https://pay.google.com/business/',
        difficulty: 'Easy',
        timeToSetup: '10-15 minutes'
      },
      {
        name: 'BHIM Merchant',
        upiPattern: '@upi',
        benefits: ['Government backed', 'Direct bank integration', 'Low fees'],
        setupLink: 'https://bhimupi.org.in/',
        difficulty: 'Medium',
        timeToSetup: '15-30 minutes'
      }
    ];
  }

  // Check daily transaction limits
  checkDailyLimit(vendor, currentAmount) {
    const dailyLimit = vendor.upiDailyLimit || 100000; // Default ₹1000 per day
    const todayTotal = vendor.dailyUpiVolume || 0;
    
    if (todayTotal + currentAmount > dailyLimit) {
      return {
        allowed: false,
        remaining: dailyLimit - todayTotal,
        dailyLimit: dailyLimit,
        message: `Daily UPI limit exceeded. Remaining limit: ₹${(dailyLimit - todayTotal) / 100}`
      };
    }
    
    return {
      allowed: true,
      remaining: dailyLimit - (todayTotal + currentAmount),
      dailyLimit: dailyLimit
    };
  }

  // Format amount for UPI (in paise)
  formatAmount(amount) {
    return Math.round(parseFloat(amount) * 100);
  }

  // Format amount for display (in rupees)
  formatDisplayAmount(paise) {
    return (paise / 100).toFixed(2);
  }
}

module.exports = new UPIService();
