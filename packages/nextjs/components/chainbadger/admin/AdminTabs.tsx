"use client";

export type AdminTab = "status" | "owner" | "templates";

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "status", label: "System Status", icon: "📊" },
  { id: "owner", label: "Owner Controls", icon: "🔑" },
  { id: "templates", label: "My Templates", icon: "🏅" },
];

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  showOwnerTab: boolean;
}

export function AdminTabs({ activeTab, onTabChange, showOwnerTab }: Props) {
  return (
    <div role="tablist" className="tabs tabs-bordered w-full">
      {TABS.filter(t => t.id !== "owner" || showOwnerTab).map(tab => (
        <button
          key={tab.id}
          role="tab"
          className={`tab gap-2 ${activeTab === tab.id ? "tab-active font-semibold" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
