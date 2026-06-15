/**
 * Companies Registration Office (CRO) — Ireland company search
 * Uses the CRO Open Data Portal API (CKAN datastore)
 * Free, no auth required, CC BY 4.0 license
 */

const CRO_API = "https://opendata.cro.ie/api/3/action/datastore_search";
const RESOURCE_ID = "3fef41bc-b8f4-4b10-8434-ce51c29b1bba";

class CROService {
  async searchCompanies(query, limit = 10) {
    if (!query || query.length < 2) return [];

    const url = `${CRO_API}?resource_id=${RESOURCE_ID}&q=${encodeURIComponent(query)}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[CRO] API error ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.success || !data.result?.records) return [];

    return data.result.records.map((r) => ({
      company_num: String(r.company_num),
      company_name: r.company_name,
      company_status: r.company_status,
      company_type: r.company_type,
      reg_date: r.company_reg_date,
      address: [r.company_address_1, r.company_address_2, r.company_address_3, r.company_address_4].filter(Boolean).join(", "),
      eircode: r.eircode,
    }));
  }

  async getCompany(companyNum) {
    const url = `${CRO_API}?resource_id=${RESOURCE_ID}&filters={"company_num":"${companyNum}"}&limit=1`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.result?.records?.length) return null;

    const r = data.result.records[0];
    return {
      company_num: String(r.company_num),
      company_name: r.company_name,
      company_status: r.company_status,
      company_type: r.company_type,
      reg_date: r.company_reg_date,
      address: [r.company_address_1, r.company_address_2, r.company_address_3, r.company_address_4].filter(Boolean).join(", "),
      eircode: r.eircode,
    };
  }
}

export default CROService;
