import React from "react";
import {
  formatUaeLocalDisplay,
  sanitizeUaeLocalInput,
  UAE_COUNTRY_CODE,
} from "../../utils/uaePhone";

type UaePhoneInputProps = {
  value: string;
  onChange: (localDigits: string) => void;
  error?: string | null;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
};

const UaePhoneInput: React.FC<UaePhoneInputProps> = ({
  value,
  onChange,
  error,
  disabled,
  id,
  placeholder = "54 544 6111",
}) => {
  const display = formatUaeLocalDisplay(value);

  return (
    <div className="space-y-1">
      <div
        className={`flex items-stretch overflow-hidden rounded-lg border bg-white transition-colors ${
          error ? "border-rose-300 ring-1 ring-rose-100" : "border-[#EEEEEE] focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-100"
        }`}
      >
        <span className="inline-flex items-center px-3 text-xs font-bold text-[#52525B] bg-[#FAFAFA] border-r border-[#EEEEEE] shrink-0">
          {UAE_COUNTRY_CODE}
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          value={display}
          onChange={(e) => onChange(sanitizeUaeLocalInput(e.target.value))}
          placeholder={placeholder}
          className="flex-1 min-w-0 border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-300"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="text-[10px] font-medium text-rose-600 px-0.5">
          {error}
        </p>
      ) : (
        <p className="text-[10px] text-[#A1A1AA] px-0.5">9-digit UAE mobile starting with 5</p>
      )}
    </div>
  );
};

export default UaePhoneInput;
