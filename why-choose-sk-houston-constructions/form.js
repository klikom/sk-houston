/**
 * Form validation and submission handler for SK Houston Constructions
 * Sends form data to Trello for lead management
 */

// Configure worker URL based on environment
const WORKER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'https://trello-api.lingering-bar-b004.workers.dev'
  : 'https://trello-api.lingering-bar-b004.workers.dev';

// Function to handle form submission
async function handleFormSubmit(form, event) {
  event.preventDefault();
  
  // Validate all required fields before submission
  const requiredFields = form.querySelectorAll('[required]');
  let isValid = true;
  requiredFields.forEach(field => {
    if (!validateField(field)) {
      isValid = false;
    }
  });
  
  if (!isValid) {
    return;
  }
  
  // Show loading state
  const submitBtn = form.querySelector('.submit-btn');
  const originalBtnText = submitBtn.textContent;
  submitBtn.textContent = 'Submitting...';
  submitBtn.disabled = true;
  
  // Extract article name from the URL path
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const articleName = pathSegments.length > 0 ? pathSegments[0] : 'homepage';
  
  // Get source and pixel from URL parameters
  const currentParams = new URLSearchParams(window.location.search);
  const source = currentParams.get('source');
  const pixel = currentParams.get('pixel');
  
  // Get form values - using form-specific IDs
  const prefix = form.id === 'ctaLeadForm' ? 'cta_' : '';
  const formData = {
    fullName: document.getElementById(prefix + 'fullName')?.value || '',
    email: document.getElementById(prefix + 'email')?.value || '',
    phone: document.getElementById(prefix + 'phone')?.value || '',
    service: document.getElementById(prefix + 'service')?.value === 'Other' 
      ? `Other: ${document.getElementById(prefix + 'otherService')?.value || ''}`
      : document.getElementById(prefix + 'service')?.value || '',
    consultationDate: document.getElementById(prefix + 'consultationDate')?.value || '',
    arrivalWindow: document.getElementById(prefix + 'arrivalWindow')?.value || '',
    address: document.getElementById(prefix + 'address')?.value || '',
    message: document.getElementById(prefix + 'message')?.value || '',
    source: source || 'direct',
    pixel: pixel || '',
    articleName: articleName,
    formLocation: form.id === 'ctaLeadForm' ? 'cta_section' : 'hero_section'
  };
  
  try {
    // Submit to our Cloudflare Worker
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin,
        'Referer': window.location.href
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData);
    }
    
    const result = await response.json();
    
    if (result.success) {
      // Create URL parameters for thank-you page
      const params = new URLSearchParams({
        service: formData.service || '',
        date: formData.consultationDate || '',
        time: formData.arrivalWindow || '',
        name: formData.fullName || '',
        source: formData.source || '',
        pixel: formData.pixel || ''
      });
      
      // Show success message before redirect
      submitBtn.textContent = 'Success!';
      submitBtn.style.backgroundColor = '#48bb78';
      
      // Small delay to show success state before redirect
      setTimeout(() => {
        // Get current directory path
        const currentPath = window.location.pathname.split('/').slice(0, -1).join('/');
        // Redirect to thank-you page in the same directory
        window.location.href = `${currentPath}/thank-you.html?${params.toString()}`;
      }, 1000);
    } else {
      throw new Error(result.error || 'Unknown error occurred');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Error adding your details to our system. Please try again or contact us directly.\n\nError details: ' + error.message);
    
    // Reset button state
    submitBtn.textContent = originalBtnText;
    submitBtn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Setup both forms
  const forms = ['leadForm', 'ctaLeadForm'];
  
  forms.forEach(formId => {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Handle Other service option
    const prefix = formId === 'ctaLeadForm' ? 'cta_' : '';
    const serviceSelect = document.getElementById(prefix + 'service');
    const otherServiceGroup = document.getElementById(prefix + 'otherServiceGroup');
    const otherServiceInput = document.getElementById(prefix + 'otherService');
    
    // Set minimum date for date picker to today
    const dateInput = document.getElementById(prefix + 'consultationDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
    }
    
    if (serviceSelect && otherServiceGroup && otherServiceInput) {
      serviceSelect.addEventListener('change', function() {
        if (this.value === 'Other') {
          otherServiceGroup.style.display = 'block';
          otherServiceInput.required = true;
        } else {
          otherServiceGroup.style.display = 'none';
          otherServiceInput.required = false;
          otherServiceInput.value = '';
        }
      });
    }
    
    // Add validation to required fields
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      field.addEventListener('blur', function() {
        validateField(field);
      });
    });
    
    // Add form submission handler
    form.addEventListener('submit', (event) => handleFormSubmit(form, event));
  });
});

/**
 * Validates an individual form field
 * @param {HTMLElement} field - The form field to validate
 * @returns {boolean} - Whether the field is valid
 */
function validateField(field) {
  // Clear previous error messages
  const existingError = field.parentNode.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  field.style.borderColor = '';
  
  let isValid = true;
  
  // Check for empty required fields
  if (field.hasAttribute('required') && !field.value.trim()) {
    addErrorMessage(field, 'This field is required');
    isValid = false;
  }
  
  // Email validation
  if (field.type === 'email' && field.value.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value)) {
      addErrorMessage(field, 'Please enter a valid email address');
      isValid = false;
    }
  }
  
  // Phone validation
  if ((field.id === 'phone' || field.id === 'cta_phone' || field.id === 'midPhone') && field.value.trim()) {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (!phoneRegex.test(field.value)) {
      addErrorMessage(field, 'Please enter a valid phone number');
      isValid = false;
    }
  }
  
  return isValid;
}

/**
 * Adds an error message below a form field
 * @param {HTMLElement} field - The form field
 * @param {string} message - The error message
 */
function addErrorMessage(field, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.color = field.closest('.mid-article-lead-form') ? '#ffdddd' : '#e53e3e';
  errorDiv.style.fontSize = '0.875rem';
  errorDiv.style.marginTop = '0.25rem';
  errorDiv.textContent = message;
  
  field.parentNode.appendChild(errorDiv);
  field.style.borderColor = field.closest('.mid-article-lead-form') ? '#ffdddd' : '#e53e3e';
  
  // Remove error styling when field is focused
  field.addEventListener('focus', function() {
    field.style.borderColor = '';
    const error = field.parentNode.querySelector('.error-message');
    if (error) {
      error.remove();
    }
  }, { once: true });
} 