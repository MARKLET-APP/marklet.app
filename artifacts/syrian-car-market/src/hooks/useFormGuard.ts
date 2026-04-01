import { useRef, useState } from "react";

export function useFormGuard<T>(initialState: T) {
  const [form, setForm] = useState(initialState);
  const isUpdating = useRef(false);

  const updateField = (key: keyof T, value: any) => {
    if (isUpdating.current) return;

    isUpdating.current = true;

    setForm(prev => ({
      ...prev,
      [key]: value,
    }));

    setTimeout(() => {
      isUpdating.current = false;
    }, 0);
  };

  return {
    form,
    setForm,
    updateField,
  };
}
