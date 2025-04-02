import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock the clarity contract calls
const mockContractCall = vi.fn()

// Mock principal addresses
const CONTRACT_OWNER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const PROVIDER_1 = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
const PROVIDER_2 = "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC"
const VERIFIER = "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND"

// Mock contract state
let mockProviders = new Map()
let mockProviderPrincipals = new Map()

// Mock contract functions
const mockGetProvider = (providerId) => {
  return mockProviders.get(providerId) || null
}

const mockGetProviderByPrincipal = (principal) => {
  const providerId = mockProviderPrincipals.get(principal)
  return providerId ? mockProviders.get(providerId) : null
}

const mockRegisterProvider = (providerId, name, specialty, licenseNumber, caller) => {
  if (mockProviderPrincipals.has(caller)) {
    return { type: "err", value: 101 } // ERR-ALREADY-REGISTERED
  }
  
  const providerData = {
    principal: caller,
    name,
    specialty,
    licenseNumber,
    active: true,
  }
  
  mockProviders.set(providerId, providerData)
  mockProviderPrincipals.set(caller, providerId)
  return { type: "ok", value: true }
}

const mockUpdateProvider = (providerId, name, specialty, licenseNumber, caller) => {
  const provider = mockProviders.get(providerId)
  
  if (!provider) {
    return { type: "err", value: 102 } // ERR-NOT-FOUND
  }
  
  if (provider.principal !== caller) {
    return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
  }
  
  const updatedProvider = {
    ...provider,
    name,
    specialty,
    licenseNumber,
  }
  
  mockProviders.set(providerId, updatedProvider)
  return { type: "ok", value: true }
}

const mockDeactivateProvider = (providerId, caller) => {
  const provider = mockProviders.get(providerId)
  
  if (!provider) {
    return { type: "err", value: 102 } // ERR-NOT-FOUND
  }
  
  if (provider.principal !== caller && caller !== CONTRACT_OWNER) {
    return { type: "err", value: 100 } // ERR-NOT-AUTHORIZED
  }
  
  const updatedProvider = {
    ...provider,
    active: false,
  }
  
  mockProviders.set(providerId, updatedProvider)
  return { type: "ok", value: true }
}

describe("Provider Identity Contract", () => {
  beforeEach(() => {
    // Reset mock state
    mockProviders = new Map()
    mockProviderPrincipals = new Map()
    mockContractCall.mockReset()
  })
  
  describe("register-provider", () => {
    it("should register a new provider successfully", () => {
      const providerId = "provider-123"
      const name = "Dr. John Doe"
      const specialty = "Cardiology"
      const licenseNumber = "MD12345"
      
      const result = mockRegisterProvider(providerId, name, specialty, licenseNumber, PROVIDER_1)
      
      expect(result.type).toBe("ok")
      expect(result.value).toBe(true)
      
      const provider = mockGetProvider(providerId)
      expect(provider).not.toBeNull()
      expect(provider.name).toBe(name)
      expect(provider.specialty).toBe(specialty)
      expect(provider.licenseNumber).toBe(licenseNumber)
      expect(provider.active).toBe(true)
    })
    
    it("should fail if provider is already registered", () => {
      const providerId1 = "provider-123"
      const providerId2 = "provider-456"
      
      mockRegisterProvider(providerId1, "Dr. John Doe", "Cardiology", "MD12345", PROVIDER_1)
      
      const result = mockRegisterProvider(providerId2, "Dr. John Doe", "Neurology", "MD67890", PROVIDER_1)
      
      expect(result.type).toBe("err")
      expect(result.value).toBe(101) // ERR-ALREADY-REGISTERED
    })
  })
  
  describe("update-provider", () => {
    it("should update provider information successfully", () => {
      const providerId = "provider-123"
      const initialName = "Dr. John Doe"
      const updatedName = "Dr. John Smith"
      
      mockRegisterProvider(providerId, initialName, "Cardiology", "MD12345", PROVIDER_1)
      
      const result = mockUpdateProvider(providerId, updatedName, "Cardiology", "MD12345", PROVIDER_1)
      
      expect(result.type).toBe("ok")
      expect(result.value).toBe(true)
      
      const provider = mockGetProvider(providerId)
      expect(provider.name).toBe(updatedName)
    })
    
    it("should fail if provider does not exist", () => {
      const result = mockUpdateProvider("non-existent", "Dr. John Doe", "Cardiology", "MD12345", PROVIDER_1)
      
      expect(result.type).toBe("err")
      expect(result.value).toBe(102) // ERR-NOT-FOUND
    })
    
    it("should fail if caller is not the provider", () => {
      const providerId = "provider-123"
      
      mockRegisterProvider(providerId, "Dr. John Doe", "Cardiology", "MD12345", PROVIDER_1)
      
      const result = mockUpdateProvider(providerId, "Dr. John Smith", "Cardiology", "MD12345", PROVIDER_2)
      
      expect(result.type).toBe("err")
      expect(result.value).toBe(100) // ERR-NOT-AUTHORIZED
    })
  })
  
  describe("deactivate-provider", () => {
    it("should deactivate a provider successfully", () => {
      const providerId = "provider-123"
      
      mockRegisterProvider(providerId, "Dr. John Doe", "Cardiology", "MD12345", PROVIDER_1)
      
      const result = mockDeactivateProvider(providerId, PROVIDER_1)
      
      expect(result.type).toBe("ok")
      expect(result.value).toBe(true)
      
      const provider = mockGetProvider(providerId)
      expect(provider.active).toBe(false)
    })
    
    it("should allow contract owner to deactivate any provider", () => {
      const providerId = "provider-123"
      
      mockRegisterProvider(providerId, "Dr. John Doe", "Cardiology", "MD12345", PROVIDER_1)
      
      const result = mockDeactivateProvider(providerId, CONTRACT_OWNER)
      
      expect(result.type).toBe("ok")
      expect(result.value).toBe(true)
      
      const provider = mockGetProvider(providerId)
      expect(provider.active).toBe(false)
    })
  })
})

