import { describe, it, expect } from "vitest";
import { unwrapResponse, unwrapArrayResponse, isSuccessResponse } from "../../lib/api/baseResponseUtils";

describe("API Response Envelope Parsing", () => {
  describe("unwrapResponse", () => {
    it("should unwrap the data field from a BaseResponse envelope", () => {
      const mockResponse = {
        data: { success: true, message: "OK", data: { id: "abc", name: "Test" } },
      };
      const result = unwrapResponse<{ id: string; name: string }>(mockResponse);
      expect(result.id).toBe("abc");
      expect(result.name).toBe("Test");
    });

    it("should return raw data when not wrapped in BaseResponse", () => {
      const mockResponse = { data: { id: "xyz" } };
      const result = unwrapResponse<{ id: string }>(mockResponse);
      expect(result.id).toBe("xyz");
    });
  });

  describe("unwrapArrayResponse", () => {
    it("should return data array from BaseResponse", () => {
      const mockResponse = {
        data: { success: true, message: "OK", data: [{ id: "1" }, { id: "2" }] },
      };
      const result = unwrapArrayResponse<{ id: string }>(mockResponse);
      expect(result.length).toBe(2);
    });

    it("should return empty array when data is null", () => {
      const mockResponse = { data: { success: true, message: "OK", data: null } };
      const result = unwrapArrayResponse<{ id: string }>(mockResponse);
      expect(result).toEqual([]);
    });
  });

  describe("isSuccessResponse", () => {
    it("should return true for success=true response", () => {
      const response = { data: { success: true, message: "OK", data: null } };
      expect(isSuccessResponse(response)).toBe(true);
    });

    it("should return false for success=false response", () => {
      const response = { data: { success: false, message: "Failed", data: null } };
      expect(isSuccessResponse(response)).toBe(false);
    });
  });
});
