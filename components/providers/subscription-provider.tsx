'use client';
import { createContext, useContext } from 'react';
import { Subscription } from '@/types';
import { isPremium } from '@/types';

interface SubscriptionContextValue {
  subscription: Subscription | null;
  isPaid: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  isPaid: false,
});

export function SubscriptionProvider({
  subscription,
  children,
}: {
  subscription: Subscription | null;
  children: React.ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={{ subscription, isPaid: isPremium(subscription) }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
