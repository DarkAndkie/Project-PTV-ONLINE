package servicios

type Usuario struct {
	Id_user   int    `gorm:"column:id_user;primaryKey;autoIncrement:false"`
	Nombre    string `gorm:"column:nombre"`
	Apellido  string `gorm:"column:apellido"`
	Tipo_user string `gorm:"column:tipo_user"`
	Celular   string `gorm: "column:celular"`
	Correo    string `gorm: "column:correo"`
	Password  string `gorm: "column:password"`
}

func (Usuario) TableName() string {
	return "usuario"
}
