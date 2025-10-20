import React from 'react';

interface FieldProps {
  children: React.ReactNode;
  className?: string;
}

interface FieldLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

interface FieldDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface FieldGroupProps {
  children: React.ReactNode;
  className?: string;
}

interface FieldSetProps {
  children: React.ReactNode;
  className?: string;
}

export function Field({ children, className = "" }: FieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
}

export function FieldLabel({ children, htmlFor, className = "" }: FieldLabelProps) {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-200 ${className}`}
    >
      {children}
    </label>
  );
}

export function FieldDescription({ children, className = "" }: FieldDescriptionProps) {
  return (
    <p className={`text-sm text-gray-400 ${className}`}>
      {children}
    </p>
  );
}

export function FieldGroup({ children, className = "" }: FieldGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

export function FieldSet({ children, className = "" }: FieldSetProps) {
  return (
    <fieldset className={`space-y-4 ${className}`}>
      {children}
    </fieldset>
  );
}
