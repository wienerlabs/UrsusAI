import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-center mb-12">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;
        const isLast = index === steps.length - 1;

        return (
          <div key={index} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-body-sm transition-colors duration-base ${
                  isCompleted
                    ? 'bg-success text-content-inverse'
                    : isActive
                    ? 'bg-accent text-content-inverse'
                    : 'bg-surface-elevated text-content-muted border border-border'
                }`}
              >
                {isCompleted ? <Check size={18} /> : stepNumber}
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center max-w-[120px]">
                <div
                  className={`text-body-sm font-medium transition-colors duration-base ${
                    isActive || isCompleted ? 'text-content-primary' : 'text-content-muted'
                  }`}
                >
                  {step}
                </div>
              </div>
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={`w-20 h-0.5 mx-4 mt-[-24px] transition-colors duration-base ${
                  currentStep > stepNumber ? 'bg-success' : 'bg-surface-elevated'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
