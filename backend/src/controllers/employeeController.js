const { db } = require('../config/firebase');

exports.getEmployees = async (req, res) => {
    try {
        const snapshot = await db.collection('employees').get();
        const employees = [];
        snapshot.forEach(doc => {
            employees.push(doc.data());
        });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { comision_porcentaje } = req.body;
        
        if (comision_porcentaje === undefined) {
            return res.status(400).json({ error: "comision_porcentaje es requerido" });
        }

        await db.collection('employees').doc(id).update({
            comision_porcentaje: parseFloat(comision_porcentaje)
        });
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
