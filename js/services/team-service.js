/**
 * TeamService - Service for managing team member data
 * Handles loading, filtering, and retrieving team information from JSON
 */

class TeamService {
  constructor() {
    this.dataUrl = '/data/team.json';
    this.cache = null;
    this.isLoading = false;
    this.error = null;
  }

  /**
   * Load team data from JSON file
   * @returns {Promise<Array>} Array of team members
   */
  async load() {
    if (this.cache) {
      return this.cache;
    }

    if (this.isLoading) {
      return new Promise((resolve, reject) => {
        const checkCache = () => {
          if (this.cache) {
            resolve(this.cache);
          } else if (this.error) {
            reject(this.error);
          } else {
            setTimeout(checkCache, 50);
          }
        };
        checkCache();
      });
    }

    this.isLoading = true;

    try {
      const response = await fetch(this.dataUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to load team data: ${response.statusText}`);
      }

      this.cache = await response.json();
      this.isLoading = false;
      this.error = null;

      return this.cache;
    } catch (err) {
      this.error = err;
      this.isLoading = false;
      console.error('TeamService: Error loading team data', err);
      throw err;
    }
  }

  /**
   * Get all team members
   * @returns {Promise<Array>} All team members
   */
  async getAll() {
    return this.load();
  }

  /**
   * Get team manager (isManager === true)
   * @returns {Promise<Object|null>} Manager object or null if not found
   */
  async getManager() {
    const team = await this.load();
    return team.find(member => member.isManager === true) || null;
  }

  /**
   * Get non-manager team members for slider
   * @returns {Promise<Array>} Array of non-manager team members
   */
  async getSliderMembers() {
    const team = await this.load();
    return team.filter(member => member.isManager !== true);
  }

  /**
   * Get team member by slug
   * @param {string} slug - Member slug (URL-friendly identifier)
   * @returns {Promise<Object|null>} Team member object or null if not found
   */
  async getBySlug(slug) {
    const team = await this.load();
    return team.find(member => member.slug === slug) || null;
  }

  /**
   * Get team member by ID
   * @param {string} id - Member ID
   * @returns {Promise<Object|null>} Team member object or null if not found
   */
  async getById(id) {
    const team = await this.load();
    return team.find(member => member.id === id) || null;
  }

  /**
   * Get team members by specialization
   * @param {string} specialization - Specialization name
   * @returns {Promise<Array>} Array of team members with specified specialization
   */
  async getBySpecialization(specialization) {
    const team = await this.load();
    return team.filter(member => 
      member.specialization && member.specialization.includes(specialization)
    );
  }

  /**
   * Search team members by name or description
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching team members
   */
  async search(query) {
    const team = await this.load();
    const lowerQuery = query.toLowerCase();

    return team.filter(member => 
      member.name.toLowerCase().includes(lowerQuery) ||
      member.shortDescription.toLowerCase().includes(lowerQuery) ||
      (member.specialization && member.specialization.some(s => 
        s.toLowerCase().includes(lowerQuery)
      ))
    );
  }

  /**
   * Get team members sorted by rating
   * @returns {Promise<Array>} Team members sorted by rating (highest first)
   */
  async getByRating() {
    const team = await this.load();
    return [...team].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  /**
   * Get team members sorted by deals count
   * @returns {Promise<Array>} Team members sorted by deals (most first)
   */
  async getByDeals() {
    const team = await this.load();
    return [...team].sort((a, b) => (b.deals || 0) - (a.deals || 0));
  }

  /**
   * Get team members sorted by experience
   * @returns {Promise<Array>} Team members sorted by experience (most first)
   */
  async getByExperience() {
    const team = await this.load();
    const parseYears = (exp) => {
      const match = exp.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    return [...team].sort((a, b) => 
      parseYears(b.experience) - parseYears(a.experience)
    );
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache() {
    this.cache = null;
    this.error = null;
  }

  /**
   * Get loading status
   * @returns {boolean} True if data is currently being loaded
   */
  isLoaded() {
    return this.cache !== null && !this.isLoading;
  }

  /**
   * Get error status
   * @returns {Error|null} Error object if loading failed, null otherwise
   */
  getError() {
    return this.error;
  }
}

// Create singleton instance
const teamService = new TeamService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = teamService;
}
