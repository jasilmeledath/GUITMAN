const addAdmin = async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
        return res.status(400).send("Admin with this email already exists.");
      }

      const saltRounds = 10; 
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const admin = new Admin({
        name,
        email,
        password: hashedPassword,
      });

      await admin.save();

      res.send("Admin added successfully.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error.");
    }
  }