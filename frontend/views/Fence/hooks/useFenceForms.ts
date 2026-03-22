import { useState, useCallback } from "react";
import { FenceData, ProjectRegionData } from "../types";

const DEFAULT_CENTER_LATLNG: [number, number] = [31.2304, 121.4737];

export const useFenceForm = () => {
  const [formData, setFormData] = useState<Partial<FenceData>>({
    name: "",
    type: "Circle",
    behavior: "No Exit",
    startTime: "00:00",
    endTime: "23:59",
    radius: 80,
    level: "Medium",
    center: DEFAULT_CENTER_LATLNG,
    points: [],
    deviceIds: [],
  });

  const resetFenceForm = useCallback((initialData?: Partial<FenceData>) => {
    setFormData(initialData || {
      name: "", type: "Circle", behavior: "No Exit", startTime: "00:00", endTime: "23:59",
      radius: 80, level: "Medium", center: DEFAULT_CENTER_LATLNG, points: [], deviceIds: [],
    });
  }, []);

  const updateFenceForm = useCallback((data: Partial<FenceData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  return { fenceFormData: formData, setFenceFormData: setFormData, updateFenceForm, resetFenceForm };
};

export const useRegionForm = () => {
  const [formData, setFormData] = useState<Partial<ProjectRegionData>>({
    name: "",
    points: [],
    remark: "",
  });

  const resetRegionForm = useCallback(() => {
    setFormData({ name: "", points: [], remark: "" });
  }, []);

  const updateRegionForm = useCallback((data: Partial<ProjectRegionData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  return { regionFormData: formData, setRegionFormData: setFormData, updateRegionForm, resetRegionForm };
};
