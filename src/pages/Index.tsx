import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { VaultAuthorityHeader } from "@/components/vault/VaultAuthorityHeader";
import { VaultHUD } from "@/components/vault/VaultHUD";
import { TradeIntentModal } from "@/components/vault/TradeIntentModal";
import { CloseTradeModal } from "@/components/vault/CloseTradeModal";
import { AuthGate } from "@/components/AuthGate";

export default function Index() {
  const [intentOpen, setIntentOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  return (
    <AuthGate>
      <AppLayout>
        <div className="max-w-xl mx-auto p-4 md:p-6 pb-24 space-y-4">
          <VaultAuthorityHeader />
          <VaultHUD
            onBuyingNow={() => setIntentOpen(true)}
            onCloseTrade={() => setCloseOpen(true)}
          />
        </div>

        <TradeIntentModal open={intentOpen} onClose={() => setIntentOpen(false)} />
        <CloseTradeModal open={closeOpen} onClose={() => setCloseOpen(false)} />
      </AppLayout>
    </AuthGate>
  );
}
