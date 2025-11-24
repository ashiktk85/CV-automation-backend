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


  async findAccepted() {
    try {
      return await this.cvModel.find({
        score: { $gte: 50, $ne: null }
      }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to find accepted CVs: ${error.message}`);
    }
  }


  async findShopifyApplicants() {
    try {
      return await this.cvModel
        .find({
          $and: [
            { jobTitle: "Shopify" },
            { score: { $ne: null } },
            { score: { $gte: 50 } },
          ],
        })
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to find Shopify applicants: ${error.message}`);
    }
  }
  


  async findRejected() {
    try {
      return await this.cvModel.find({
        $or: [
          { score: { $lt: 50, $ne: null } },
          { score: null },
          { score: { $exists: false } }
        ]
      }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to find rejected CVs: ${error.message}`);
    }
  }


  async findStarred() {
    try {
      return await this.cvModel.find({ starred: true }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to find starred CVs: ${error.message}`);
    }
  }


  async updateStarred(id, starred) {
    try {
      return await this.cvModel.findByIdAndUpdate(
        id,
        { starred },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to update starred status: ${error.message}`);
    }
  }


  async deleteById(id) {
    try {
      return await this.cvModel.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`Failed to delete CV: ${error.message}`);
    }
  }


  async countWithQuery(query = {}, startDate = null, endDate = null) {
    try {
      const dateQuery = {};
      if (startDate || endDate) {
        dateQuery.createdAt = {};
        if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
        if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
      }
      const finalQuery = { ...query, ...dateQuery };
      return await this.cvModel.countDocuments(finalQuery);
    } catch (error) {
      throw new Error(`Failed to count CVs: ${error.message}`);
    }
  }


  async findWithOptions(query = {}, options = {}) {
    try {
      const { search, minScore, sortBy = 'createdAt', sortOrder = -1, page = 1, limit = 12 } = options;
      
      if (search) {
        const searchConditions = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
        
        if (query.$or) {
          query.$and = [
            { $or: query.$or },
            { $or: searchConditions }
          ];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }

      if (minScore !== undefined && minScore !== null) {
        if (query.score) {
          query.score = { ...query.score, $gte: minScore };
        } else {
          query.score = { $gte: minScore, $ne: null };
        }
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const total = await this.cvModel.countDocuments(query);
      
      const data = await this.cvModel.find(query).sort(sort).skip(skip).limit(limit);

      return {
        data,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to find CVs with options: ${error.message}`);
    }
  }
}

module.exports = CVRepository;
