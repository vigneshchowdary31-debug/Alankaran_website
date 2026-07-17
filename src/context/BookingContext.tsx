import React, { createContext, useContext, useState, ReactNode } from "react";
import BookingModal from "@/components/BookingModal";

interface BookingOptions {
  eventType?: string;
  message?: string;
}

interface BookingContextType {
  openBookingModal: (options?: BookingOptions) => void;
  closeBookingModal: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<BookingOptions | undefined>(undefined);

  const openBookingModal = (opts?: BookingOptions) => {
    setOptions(opts);
    setIsOpen(true);
  };
  const closeBookingModal = () => {
    setIsOpen(false);
    setOptions(undefined);
  };

  return (
    <BookingContext.Provider value={{ openBookingModal, closeBookingModal }}>
      {children}
      <BookingModal isOpen={isOpen} onClose={closeBookingModal} options={options} />
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
