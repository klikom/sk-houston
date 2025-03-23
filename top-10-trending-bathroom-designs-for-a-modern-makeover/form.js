/**
 * Form validation and submission handler for SK Houston Constructions
 * Sends form data to Trello for lead management
 */

// Configure worker URL based on environment
const WORKER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'https://trello-api-dev.workers.dev'
  : 'https://trello-api.lingering-bar-b004.workers.dev';

document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('form');
  if (!form) return;
  
  // Get source and pixel from URL parameters
  const currentParams = new URLSearchParams(window.location.search);
  const source = currentParams.get('source');
  const pixel = currentParams.get('pixel');
  
  // Update form ID to match the provided code
  form.id = 'leadForm';
  
  // Handle Other service option
  const serviceSelect = document.getElementById('service');
  const otherServiceGroup = document.getElementById('otherServiceGroup');
  const otherServiceInput = document.getElementById('otherService');
  
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
  
  // Add validation to required fields
  const requiredFields = form.querySelectorAll('[required]');
  requiredFields.forEach(field => {
    field.addEventListener('blur', function() {
      validateField(field);
    });
  });
  
  // Form submission handler
  document.getElementById('leadForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Validate all required fields before submission
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
    console.log('Current path:', window.location.pathname);
    console.log('Path segments:', pathSegments);
    console.log('Article name:', articleName);
    
    // Get form values
    const formData = {
      fullName: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      service: document.getElementById('service').value === 'Other' 
        ? `Other: ${document.getElementById('otherService').value}`
        : document.getElementById('service').value,
      consultationDate: document.getElementById('consultationDate').value,
      arrivalWindow: document.getElementById('arrivalWindow').value,
      address: document.getElementById('address').value || '',
      message: document.getElementById('message').value,
      source: source || 'direct',
      pixel: pixel || '',
      articleName: articleName // Add article name to form data
    };
    
    try {
      console.log('Submitting form data:', formData);
      console.log('Using worker URL:', WORKER_URL);
      
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
      console.log('Response data:', result);
      
      if (result.success) {
        // Create URL parameters for thank-you page
        const params = new URLSearchParams({
          service: formData.service,
          date: formData.consultationDate,
          time: formData.arrivalWindow,
          name: formData.fullName,
          source: formData.source,
          pixel: formData.pixel
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
  if (field.id === 'phone' && field.value.trim()) {
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
  errorDiv.style.color = '#e53e3e';
  errorDiv.style.fontSize = '0.875rem';
  errorDiv.style.marginTop = '0.25rem';
  errorDiv.textContent = message;
  
  field.parentNode.appendChild(errorDiv);
  field.style.borderColor = '#e53e3e';
  
  // Remove error styling when field is focused
  field.addEventListener('focus', function() {
    field.style.borderColor = '';
    const error = field.parentNode.querySelector('.error-message');
    if (error) {
      error.remove();
    }
  }, { once: true });
} 