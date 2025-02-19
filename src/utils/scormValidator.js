/**
 * Validates a SCORM manifest for compliance with SCORM 1.2
 * @param {File|Blob} file - The imsmanifest.xml file
 * @returns {Promise<string|null>} - Error message or null if valid
 */
export async function validateScormManifest(file) {
  try {
    const xmlContent = await file.async('text')
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

    // Check if manifest exists
    const manifest = xmlDoc.querySelector('manifest')
    if (!manifest) {
      return 'Invalid manifest: <manifest> element not found'
    }

    // Check SCORM version based on schema definitions
    const scorm12Schemas = [
      'http://www.imsproject.org/xsd/imscp_rootv1p1p2',
      'http://www.adlnet.org/xsd/adlcp_rootv1p2',
      'http://www.imsproject.org/xsd/imsmd_rootv1p2p1',
      'adlcp_rootv1p2'
    ]

    const scorm2004Schemas = [
      'http://www.adlnet.org/xsd/adlcp_v1p3',
      'http://www.adlnet.org/xsd/adlscorm_v1p3',
      'http://www.imsglobal.org/xsd/imscp_v1p1',
      'http://www.adlnet.org/XSD/SCORM_CAM_v1.3'
    ]

    const isScorm12 = scorm12Schemas.some(schema => {
      return manifest.getAttribute('xmlns')?.includes(schema) ||
             manifest.getAttribute('xmlns:adlcp')?.includes(schema) ||
             manifest.getAttribute('xsi:schemaLocation')?.includes(schema)
    })

    const isScorm2004 = scorm2004Schemas.some(schema => {
      return manifest.getAttribute('xmlns')?.includes(schema) ||
             manifest.getAttribute('xmlns:adlcp')?.includes(schema) ||
             manifest.getAttribute('xsi:schemaLocation')?.includes(schema)
    })

    if (isScorm2004) {
      return 'SCORM 2004 package detected: This version is not supported'
    }

    if (!isScorm12) {
      return 'Possibly not a SCORM package: Schema not recognized'
    }

    // Check required elements
    const organizations = xmlDoc.querySelector('organizations')
    const resources = xmlDoc.querySelector('resources')
    
    if (!organizations) {
      return 'Invalid manifest: <organizations> element not found'
    }
    if (!resources) {
      return 'Invalid manifest: <resources> element not found'
    }

    // Check if at least one organization exists
    const organization = organizations.querySelector('organization')
    if (!organization) {
      return 'Invalid manifest: No <organization> defined'
    }

    // Check if at least one resource exists
    const resource = resources.querySelector('resource')
    if (!resource) {
      return 'Invalid manifest: No <resource> defined'
    }

    return null // No warning
  } catch (error) {
    return 'Error parsing manifest: ' + error.message
  }
} 