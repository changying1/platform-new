import React, { useState, useRef, useEffect } from "react";
import { FenceSidebar } from "./components/FenceSidebar";
import { FenceEditor } from "./components/FenceEditor";
import { RegionEditor } from "./components/RegionEditor";
import { DevicePicker } from "./components/DevicePicker";
import { AlarmOverlay, MapControls, ProjectSearchBar, DeviceJumpMenu } from "./components/MapOverlays";
import { useFenceLogic } from "./hooks/useFenceLogic";
import { useFenceMap } from "./hooks/useFenceMap";
import { useFenceForm, useRegionForm } from "./hooks/useFenceForms";
import { FenceData } from "./types";

export default function FenceManagement() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Logic & Map Hooks
  const logic = useFenceLogic();
  const map = useFenceMap(containerRef);
  
  // Form Hooks
  const { fenceFormData, updateFenceForm, resetFenceForm } = useFenceForm();
  const { regionFormData, updateRegionForm, resetRegionForm } = useRegionForm();
  
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const styleId = "fence-cyber-style";
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
      @keyframes fence-panel-pulse {
        0%, 100% { opacity: .55; }
        50% { opacity: 1; }
      }
      .fence-cyber-scroll::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .fence-cyber-scroll::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.45);
      }
      .fence-cyber-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #38bdf8, #2563eb);
        border-radius: 999px;
      }
    `;
    document.head.appendChild(styleEl);
  }, []);

  // Sync Map with Data & Drafts
  useEffect(() => {
    if (!map.mapReady) return;
    const renderRegions = searchOpen && logic.selectedProjectRegions.length > 0 ? logic.selectedProjectRegions : logic.regions;
    
    // 如果处于新建/编辑状态（无论是围栏还是区域），不传 onRegionClick 处理函数。
    // 这会导致 map.renderFences 内部将 bubble 设为 true，从而让点击穿透到地图，避免“误触”区域。
    const isInteracting = 
      logic.viewMode === "create" || 
      logic.viewMode === "edit" || 
      logic.viewMode === "region_create" || 
      logic.viewMode === "region_edit";

    map.renderFences(
      logic.fences,
      renderRegions,
      logic.selectedFence?.id,
      logic.selectedRegion?.id,
      isInteracting ? undefined : (region) => {
        logic.setSelectedRegion(region);
        map.setCenter(region.points[0]);
        logic.setViewMode("region_list");
      }
    );
    map.renderDevices(logic.devices, logic.violationTypes, new Set()); 
    map.renderDraft(logic.viewMode, fenceFormData, regionFormData);
    if (logic.selectedFence && logic.viewMode === "list") map.setCenter(logic.selectedFence.center);
  }, [map.mapReady, logic.fences, logic.regions, logic.devices, logic.selectedFence, logic.selectedRegion, logic.viewMode, fenceFormData, regionFormData, logic.violationTypes, searchOpen, logic.selectedProjectRegions]);

  // Handle Map Interaction
  useEffect(() => {
    if (!map.mapReady || logic.viewMode === "list") return;
    return map.bindClick((lat, lng) => {
      if (logic.viewMode === "create" || logic.viewMode === "edit") {
        if (fenceFormData.type === "Circle") updateFenceForm({ center: [lat, lng] });
        else updateFenceForm({ points: [...(fenceFormData.points || []), [lat, lng]] });
      } else if (logic.viewMode === "region_create") {
        updateRegionForm({ points: [...(regionFormData.points || []), [lat, lng]] });
      }
    });
  }, [map.mapReady, logic.viewMode, fenceFormData.type, fenceFormData.points, regionFormData.points]);

  // View Init Handlers
  const handleEdit = (fence: FenceData) => { resetFenceForm(fence); logic.setSelectedFence(fence); logic.setViewMode("edit"); };
  const handleCreateFence = () => { resetFenceForm(); logic.setViewMode("create"); };
  const handleCreateRegion = () => { resetRegionForm(); logic.setViewMode("region_create"); };

  return (
    <div className="flex h-full w-full overflow-hidden relative bg-white text-slate-100">
      <FenceSidebar
        fences={logic.fences} regions={logic.regions}
        selectedFence={logic.selectedFence} selectedRegion={logic.selectedRegion}
        viewMode={logic.viewMode} onSelectFence={logic.setSelectedFence}
        onSelectRegion={logic.setSelectedRegion} onCreateNew={handleCreateFence}
        onCreateRegion={handleCreateRegion} onEdit={handleEdit}
        onDelete={(id, e) => { e.stopPropagation(); logic.deleteFence(id); }}
        onDeleteRegion={(id, e) => { e.stopPropagation(); logic.deleteRegion(id); }}
        onSwitchView={logic.setViewMode}
      />

      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />
        <MapControls mapReady={map.mapReady} />
        <ProjectSearchBar
          query={logic.projectSearchQuery}
          loading={logic.projectSearchLoading}
          options={logic.projectSearchResults}
          regions={logic.selectedProjectRegions}
          isOpen={searchOpen}
          onQueryChange={(value) => {
            logic.setProjectSearchQuery(value);
            setSearchOpen(true);
            logic.searchProjects(value);
          }}
          onPickProject={(project) => {
            logic.setProjectSearchQuery(project.name);
            setSearchOpen(true);
            logic.fetchProjectRegions(project.id);
          }}
          onPickRegion={(region) => {
            logic.setSelectedRegion(region);
            logic.setViewMode("region_list");
            map.setCenter(region.points[0]);
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
        <AlarmOverlay alarms={logic.recentAlarms} />
        <DeviceJumpMenu 
          devices={logic.devices} 
          onJump={(device) => {
            if (device.lat && device.lng) {
              map.setCenter([device.lat, device.lng]);
            }
          }} 
        />

        {/* Dynamic Editors */}
        {(logic.viewMode === "create" || logic.viewMode === "edit") && (
          <FenceEditor
            formData={fenceFormData} regions={logic.regions} isEdit={logic.viewMode === "edit"}
            onClose={() => logic.setViewMode("list")} onSave={() => logic.saveFence(fenceFormData)}
            onChange={updateFenceForm} onPickCenter={() => {}} onShowDeviceModal={() => setShowDeviceModal(true)}
          />
        )}

        {logic.viewMode === "region_create" && (
          <RegionEditor
            formData={regionFormData} onClose={() => logic.setViewMode("region_list")}
            onSave={() => logic.saveRegion(regionFormData)} onChange={updateRegionForm}
          />
        )}

        {/* Global Picker */}
        {showDeviceModal && (
          <DevicePicker
            devices={logic.devices} selectedIds={fenceFormData.deviceIds || []}
            onClose={() => setShowDeviceModal(false)}
            onConfirm={(ids) => { updateFenceForm({ deviceIds: ids }); setShowDeviceModal(false); }}
          />
        )}
      </div>
    </div>
  );
}
