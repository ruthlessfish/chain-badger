"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { AdminTab, AdminTabs, MyTemplatesPanel, OwnerControls, SystemStatus } from "~~/components/chainbadger/admin";
import { useAdminStatus } from "~~/hooks/chainbadger/useAdminStatus";

const AdminPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("status");
  const { isOwner } = useAdminStatus();

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        {/* Hero */}
        <div className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-bold">🛡️ Admin Panel</h1>
          <p className="text-base-content/60 max-w-md mx-auto">
            Manage the badge ecosystem — system health, contract configuration, and your templates.
          </p>
        </div>

        {/* Tab navigation */}
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} showOwnerTab={isOwner} />

        {/* Tab content */}
        {activeTab === "status" && <SystemStatus />}
        {activeTab === "owner" && <OwnerControls />}
        {activeTab === "templates" && <MyTemplatesPanel />}
      </div>
    </main>
  );
};

export default AdminPage;
