import React, { useState } from 'react';
import { AlertCircle, Check, Info } from 'lucide-react';

/**
 * Hook para validación de formularios en tiempo real
 */
export function useFormValidation(initialValues, validationRules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = (fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    // Required
    if (rules.required && !value) {
      return rules.requiredMessage || 'Este campo es obligatorio';
    }

    // Min length
    if (rules.minLength && value.length < rules.minLength) {
      return rules.minLengthMessage || `Mínimo ${rules.minLength} caracteres`;
    }

    // Max length
    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.maxLengthMessage || `Máximo ${rules.maxLength} caracteres`;
    }

    // Pattern (regex)
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.patternMessage || 'Formato inválido';
    }

    // Custom validator
    if (rules.custom) {
      return rules.custom(value, values);
    }

    // Numeric range
    if (rules.min !== undefined && parseFloat(value) < rules.min) {
      return rules.minMessage || `Valor mínimo: ${rules.min}`;
    }

    if (rules.max !== undefined && parseFloat(value) > rules.max) {
      return rules.maxMessage || `Valor máximo: ${rules.max}`;
    }

    return null;
  };

  const handleChange = (fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate on change if field was touched
    if (touched[fieldName]) {
      const error = validate(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validate(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Componente de Input con validación en tiempo real
 */
export function ValidatedInput({
  label,
  name,
  type = 'text',
  value,
  error,
  touched,
  placeholder,
  helpText,
  required = false,
  onChange,
  onBlur,
  icon: Icon,
  ...props
}) {
  const hasError = touched && error;
  const isValid = touched && !error && value;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={20} />
          </div>
        )}
        
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          onBlur={() => onBlur(name)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 rounded-xl border-2 transition-all
            ${Icon ? 'pl-11' : ''}
            ${hasError 
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
              : isValid
              ? 'border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200'
              : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
            }
            ${hasError || isValid ? 'pr-11' : ''}
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : helpText ? `${name}-help` : undefined}
          {...props}
        />

        {/* Status Icon */}
        {(hasError || isValid) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasError ? (
              <AlertCircle className="text-red-500" size={20} />
            ) : (
              <Check className="text-green-500" size={20} />
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      {helpText && !hasError && (
        <p id={`${name}-help`} className="text-xs text-gray-500 flex items-start gap-1">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {hasError && (
        <p id={`${name}-error`} className="text-sm text-red-600 flex items-start gap-1 animate-fadeIn">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Componente de Select con validación
 */
export function ValidatedSelect({
  label,
  name,
  value,
  error,
  touched,
  options = [],
  required = false,
  onChange,
  onBlur,
  placeholder = 'Seleccione una opción',
  helpText,
  ...props
}) {
  const hasError = touched && error;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        className={`
          w-full px-4 py-3 rounded-xl border-2 transition-all
          ${hasError 
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
            : 'border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
          }
        `}
        aria-invalid={hasError}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {helpText && !hasError && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}

      {hasError && (
        <p className="text-sm text-red-600 flex items-start gap-1 animate-fadeIn">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}
