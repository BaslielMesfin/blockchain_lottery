"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@/app/context/WalletContext";

interface UsdPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsdPaymentModal({ isOpen, onClose }: UsdPaymentModalProps) {
  const { ticketPrice, ethUsdPrice, buyTicketWithUsd, isBuying } = useWallet();
  
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  
  const [errors, setErrors] = useState<{
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
    name?: string;
  }>({});

  const ticketPriceUsd = parseFloat(ticketPrice) * ethUsdPrice;

  // Clear fields on close
  useEffect(() => {
    if (!isOpen) {
      setCardNumber("");
      setExpiry("");
      setCvc("");
      setName("");
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-format card number: "1234 5678 1234 5678"
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const trimmed = raw.substr(0, 16);
    const parts = [];
    for (let i = 0; i < trimmed.length; i += 4) {
      parts.push(trimmed.substr(i, 4));
    }
    setCardNumber(parts.length > 0 ? parts.join(" ") : "");
    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: undefined }));
    }
  };

  // Auto-format expiry date: "MM/YY"
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/gi, "");
    if (raw.length > 4) raw = raw.substring(0, 4);

    if (raw.length >= 2) {
      const month = raw.substring(0, 2);
      const year = raw.substring(2);
      
      // Basic month validation
      let formattedMonth = month;
      if (parseInt(month, 10) > 12) {
        formattedMonth = "12";
      } else if (parseInt(month, 10) === 0 && month.length === 2) {
        formattedMonth = "01";
      }
      
      setExpiry(`${formattedMonth}/${year}`);
    } else {
      setExpiry(raw);
    }

    if (errors.expiry) {
      setErrors(prev => ({ ...prev, expiry: undefined }));
    }
  };

  // Validate and format CVC
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/gi, "").substring(0, 4);
    setCvc(raw);
    if (errors.cvc) {
      setErrors(prev => ({ ...prev, cvc: undefined }));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perform validations
    const newErrors: typeof errors = {};
    
    const plainCardNumber = cardNumber.replace(/\s+/g, "");
    if (plainCardNumber.length < 15 || plainCardNumber.length > 16) {
      newErrors.cardNumber = "Invalid card number (must be 15-16 digits)";
    }
    
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      newErrors.expiry = "Use MM/YY format";
    } else {
      const [m, y] = expiry.split("/").map(num => parseInt(num, 10));
      if (m < 1 || m > 12) {
        newErrors.expiry = "Month must be 01-12";
      }
    }
    
    if (cvc.length < 3 || cvc.length > 4) {
      newErrors.cvc = "Must be 3 or 4 digits";
    }
    
    if (name.trim().length < 2) {
      newErrors.name = "Full name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Call submit
    await buyTicketWithUsd({ cardNumber, expiry, cvc, name });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/80 backdrop-blur-sm p-4">
      {/* Modal Container */}
      <div className="bg-surface-indigo text-primary border border-outline-variant ticket-notch w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          disabled={isBuying}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <span className="font-label-mono text-[10px] text-secondary-fixed uppercase tracking-widest block mb-1 font-bold">
              // secure checkout
            </span>
            <h3 className="font-headline-lg text-2xl uppercase tracking-tight text-primary">
              Pay with USD / Card
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant mt-1">
              Complete the fields below to simulate a credit card transaction and issue your ticket.
            </p>
          </div>

          {/* Amount Badge */}
          <div className="bg-surface-container-lowest border border-outline-variant/50 p-4 mb-6 flex justify-between items-center">
            <div>
              <span className="font-label-mono text-[10px] text-on-surface-variant/70 block uppercase">
                Ticket Price (ETH)
              </span>
              <span className="font-ticket-id font-bold text-sm text-primary">
                {ticketPrice} ETH
              </span>
            </div>
            <div className="text-right">
              <span className="font-label-mono text-[10px] text-secondary-fixed block uppercase">
                USD Amount Due
              </span>
              <span className="font-ticket-id font-bold text-lg text-success-green">
                ${ticketPriceUsd.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Cardholder Name */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-mono text-[10px] uppercase text-on-surface-variant tracking-wider">
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="e.g. Satoshi Nakamoto"
                value={name}
                onChange={handleNameChange}
                disabled={isBuying}
                className="bg-surface-container-lowest border border-outline-variant/60 text-primary px-3 py-2 text-sm focus:outline-none focus:border-secondary-fixed transition-colors font-body-md placeholder:opacity-40"
              />
              {errors.name && (
                <span className="font-label-mono text-[10px] text-error mt-0.5">{errors.name}</span>
              )}
            </div>

            {/* Card Number */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-mono text-[10px] uppercase text-on-surface-variant tracking-wider">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={isBuying}
                  className="bg-surface-container-lowest border border-outline-variant/60 text-primary pl-10 pr-3 py-2 w-full text-sm focus:outline-none focus:border-secondary-fixed transition-colors font-ticket-id placeholder:opacity-40"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                  credit_card
                </span>
              </div>
              {errors.cardNumber && (
                <span className="font-label-mono text-[10px] text-error mt-0.5">{errors.cardNumber}</span>
              )}
            </div>

            {/* Expiry & CVC */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-mono text-[10px] uppercase text-on-surface-variant tracking-wider">
                  Expiration
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  disabled={isBuying}
                  className="bg-surface-container-lowest border border-outline-variant/60 text-primary px-3 py-2 text-sm focus:outline-none focus:border-secondary-fixed transition-colors font-ticket-id placeholder:opacity-40 text-center"
                />
                {errors.expiry && (
                  <span className="font-label-mono text-[10px] text-error mt-0.5">{errors.expiry}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-mono text-[10px] uppercase text-on-surface-variant tracking-wider">
                  CVC
                </label>
                <input
                  type="password"
                  placeholder="•••"
                  value={cvc}
                  onChange={handleCvcChange}
                  disabled={isBuying}
                  className="bg-surface-container-lowest border border-outline-variant/60 text-primary px-3 py-2 text-sm focus:outline-none focus:border-secondary-fixed transition-colors font-ticket-id placeholder:opacity-40 text-center"
                />
                {errors.cvc && (
                  <span className="font-label-mono text-[10px] text-error mt-0.5">{errors.cvc}</span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isBuying}
              className="mt-4 w-full bg-primary-container text-on-primary-fixed font-headline-lg text-lg py-3 px-6 hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 uppercase font-bold"
            >
              {isBuying ? (
                <>
                  <span className="spinner !border-on-primary-fixed !border-t-transparent" />
                  PROCESSING…
                </>
              ) : (
                `Pay $${ticketPriceUsd.toFixed(2)} USD & Issue Ticket`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
