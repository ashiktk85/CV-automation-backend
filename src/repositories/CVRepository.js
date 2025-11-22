class CVRepository {
  constructor(cvModel) {
    this.cvModel = cvModel;
  }

  async findAll() {
    try {
      return await this.cvModel.find().sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to find all CVs: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      return await this.cvModel.findById(id);
    } catch (error) {
      throw new Error(`Failed to find CV by ID: ${error.message}`);
    }
  }

  async create(cvRecord) {
    try {
      const cv = new this.cvModel(cvRecord);
      return await cv.save();
    } catch (error) {
      throw new Error(`Failed to create CV: ${error.message}`);
    }
  }

  async count() {
    try {
      return await this.cvModel.countDocuments();
    } catch (error) {
      throw new Error(`Failed to count CVs: ${error.message}`);
    }
  }
}

module.exports = CVRepository;
