const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string()
  .min(3)
  .max(50)
  .optional()
  .messages({
    'string.empty': 'Nama tidak boleh kosong',
    'string.min': 'Nama harus memiliki setidaknya 3 karakter',
    'string.max': 'Nama tidak boleh lebih dari 50 karakter',
  }),
  email: Joi.string()
  .email()
  .optional()
  .messages({
    'string.base': 'Email harus berupa teks',
    'string.email': 'Email harus valid',
    'string.empty': 'Email tidak boleh kosong'
  }),

  phone_number: Joi.string()
    .pattern(/^628[0-9]{8,12}$/)
    .optional()
    .messages({
    'string.empty': 'Nomor telepon tidak boleh kosong',
    'string.pattern.base': 'Nomor telepon harus dimulai dengan 628 tanpa simbol apapun dan memiliki panjang antara 10 hingga 15 karakter, contoh: 628111111111'
    }),
    
  password: Joi.string()
  .pattern(new RegExp("^(?=.*[a-zA-Z])(?=.*[0-9])"))
  .min(8)
  .required()
  .messages({
    'string.empty': 'Kata sandi tidak boleh kosong',
    'string.pattern.base': "Kata sandi harus mengandung huruf dan angka",
    'string.min': 'Kata sandi harus memiliki setidaknya {#limit} karakter',
    'any.required': 'Kata sandi wajib diisi'
  }),
  confirm_password: Joi.string()
  .valid(Joi.ref('password'))
  .required()
  .messages({
    'any.only': 'Konfirmasi kata sandi harus cocok dengan kata sandi',
    'string.empty': 'Konfirmasi kata sandi tidak boleh kosong',
    'any.required': 'Konfirmasi kata sandi wajib diisi'
  }),
  role: Joi.string()
  .valid('patient', 'psychologist', 'admin')
  .optional()
}).unknown(false);;

const loginSchema = Joi.object({
    email: Joi.string()
    .email()
    .required()
    .messages({
        'string.base': 'Email harus berupa teks',
        'string.email': 'Email harus valid',
        'string.empty': 'Email tidak boleh kosong',
        'any.required': 'Email wajib diisi'
    }),
    password: Joi.string()
    .min(6)
    .required()
    .messages({
        'string.empty': 'Kata sandi tidak boleh kosong',
        'string.min': 'Kata sandi harus memiliki setidaknya {#limit} karakter',
        'any.required': 'Kata sandi wajib diisi'
    })
})

const resetPasswordSchema = Joi.object({
  new_password: Joi.string()
    .pattern(new RegExp("^(?=.*[a-zA-Z])(?=.*[0-9])"))
    .min(8)
    .required()
    .messages({
      'string.empty': 'Kata sandi baru tidak boleh kosong',
      'string.pattern.base': "Kata sandi baru harus mengandung huruf dan angka",
      'string.min': 'Kata sandi baru harus memiliki setidaknya {#limit} karakter',
      'any.required': 'Kata sandi baru wajib diisi'
    }),
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Konfirmasi kata sandi baru harus cocok dengan kata sandi baru',
      'string.empty': 'Konfirmasi kata sandi baru tidak boleh kosong',
      'any.required': 'Konfirmasi kata sandi baru wajib diisi'
    })
});

const editProfileSchema = Joi.object({
    nickname: Joi.string()
    .max(20)
    .optional(),

    name: Joi.string()
    .min(3)
    .max(50)
    .optional()
    .messages({
        'string.empty': 'Nama tidak boleh kosong',
        'string.min': 'Nama harus memiliki setidaknya 3 karakter'
    }),

    email: Joi.string()
    .email()
    .optional()
    .messages({
        'string.base': 'Email harus berupa teks',
        'string.email': 'Email harus valid'
    }),

    phone_number: Joi.string()
    .pattern(/^628[0-9]{8,12}$/)
    .min(10)
    .max(15)
    .optional()
    .messages({
      'string.empty': 'Nomor telepon tidak boleh kosong',
      'string.pattern.base': 'Nomor telepon harus dimulai dengan 628 tanpa simbol apapun dan memiliki panjang antara 10 hingga 15 karakter, contoh: 628111111111',
      'any.required': 'Nomor telepon wajib diisi'
    }),

    birthdate: Joi.date()
    .optional(),

    gender: Joi.string()
    .valid('Laki-laki', 'Perempuan', 'Lainnya')
    .insensitive()
    .optional(),

    password: Joi.string()
    .pattern(new RegExp("^(?=.*[a-zA-Z])(?=.*[0-9])"))
    .min(8)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': "Kata sandi harus mengandung huruf dan angka",
      'string.min': 'Kata sandi harus memiliki setidaknya {#limit} karakter',
    }),
  });

const editPsychologistProfileSchema = Joi.object({
  name: Joi.string()
  .min(3)
  .max(50)
  .optional()
  .messages({
    'string.min': 'Nama minimal 3 karakter',
    'string.max': 'Nama maksimal 50 karakter',
  }),
    
  nickname: Joi.string()
  .max(20)
  .optional(),
  
  phone_number: Joi.string()
  .pattern(/^628[0-9]{8,12}$/)
  .min(10)
  .max(15)
  .optional()
  .messages({
    'string.empty': 'Nomor telepon tidak boleh kosong',
    'string.pattern.base': 'Nomor telepon harus dimulai dengan 628 tanpa simbol apapun dan memiliki panjang antara 10 hingga 15 karakter, contoh: 628111111111',
    'any.required': 'Nomor telepon wajib diisi'
  }),

  email: Joi.string()
    .email()
    .optional()
    .messages({
        'string.base': 'Email harus berupa teks',
        'string.email': 'Email harus valid',
        'string.empty': 'Email tidak boleh kosong',
        'any.required': 'Email wajib diisi'
    }),
  
  birthdate: Joi.date().iso().optional().messages({
    'date.base': 'Tanggal lahir harus format (YYYY-MM-DD)',
  }),
  
  gender: Joi.string()
  .valid('Laki_laki', 'Perempuan', 'Lainnya')
  .insensitive()
  .optional()
  .messages({
    'any.only': 'Gender hanya boleh laki_laki, perempuan, atau lainnya',
  }),
  
  bio: Joi.string()
  .max(1000)
  .optional()
  .messages({
    'string.max': 'Bio maksimal 1000 karakter',
  }),
  
  experience: Joi.string()
  .max(1000)
  .optional()
  .messages({
    'string.max': 'Bio maksimal 1000 karakter',
  }),
  
  topics: Joi.array()
  .items(Joi.number().integer().positive())
  .optional()
  .custom((value, helpers) => {
    if (value === undefined || value.length === 0) {
      return value;
    }
    
    const invalidTopic = value.find(item => typeof item !== 'number' || item <= 0);
    if (invalidTopic) {
      return helpers.error('number.base'); 
    }

    return value;
  })
  .messages({
    'array.base': 'Topics harus berupa array angka positif',
    'number.base': 'Topic ID harus berupa angka',
  })
 
});

const addPsychologistSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Nama tidak boleh kosong',
      'string.min': 'Nama harus memiliki setidaknya 3 karakter',
      'string.max': 'Nama tidak boleh lebih dari 50 karakter',
      'any.required': 'Nama wajib diisi'
    }),
  nickname: Joi.string()
    .max(20)
    .optional()
    .messages({
      'string.max': 'Nickname maksimal 20 karakter',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email harus berupa teks',
      'string.email': 'Email harus valid',
      'string.empty': 'Email tidak boleh kosong',
      'any.required': 'Email wajib diisi'
    }),
  phone_number: Joi.string()
    .pattern(/^628[0-9]{8,12}$/)
    .min(10)
    .max(15)
    .required()
    .messages({
      'string.empty': 'Nomor telepon tidak boleh kosong',
      'string.pattern.base': 'Nomor telepon harus dimulai dengan 628 tanpa simbol apapun dan memiliki panjang antara 10 hingga 15 karakter, contoh: 628111111111',
      'any.required': 'Nomor telepon wajib diisi'
    }),
  birthdate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.base': 'Tanggal lahir harus format (YYYY-MM-DD)',
      'any.required': 'Tanggal lahir wajib diisi'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.empty': 'Kata sandi tidak boleh kosong',
      'string.min': 'Kata sandi harus memiliki setidaknya {#limit} karakter',
      'any.required': 'Kata sandi wajib diisi'
    }),
  bio: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Bio maksimal 1000 karakter',
    }),
  experience: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Pengalaman maksimal 1000 karakter',
    }),
  price: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Harga harus berupa angka',
      'number.integer': 'Harga harus berupa bilangan bulat',
      'number.min': 'Harga tidak boleh negatif',
      'any.required': 'Harga wajib diisi'
    }),

  gender: Joi.string()
    .valid('Laki-laki', 'Perempuan', 'Lainnya')
    .insensitive()
    .optional(),

  topics: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .custom((value, helpers) => {
      if (value === undefined || value.length === 0) {
        return value;
      }
      
      const invalidTopic = value.find(item => typeof item !== 'number' || item <= 0);
      if (invalidTopic) {
        return helpers.error('number.base'); 
      }

      return value;
    })
    .messages({
      'array.base': 'Topics harus berupa array angka positif',
      'number.base': 'Topic ID harus berupa angka',
    }),
  schedules: Joi.array()
    .items(
      Joi.object({
        day: Joi.string()
          .valid('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')
          .insensitive()
          .optional(),
        date: Joi.date().iso().optional(),
        time: Joi.string()
          .pattern(/^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/)
          .optional()
          .messages({
            'string.pattern.base': 'Waktu harus dalam format HH:mm - HH:mm atau HH:mm-HH:mm',
          })
      })
    )
    .optional()
    .messages({
      'array.base': 'Jadwal harus berupa array objek',
    })
});



const changeAvailabilitySchema = Joi.object({
  availability: Joi.string()
    .valid('available', 'unavailable')
    .insensitive()
    .required()
    .messages({
      'any.only': 'Ketersediaan hanya boleh "available" atau "unavailable"',
      'string.empty': 'Ketersediaan tidak boleh kosong',
      'any.required': 'Ketersediaan wajib diisi',
    })
});

const articleSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(150)
    .required()
    .messages({
      'string.empty': 'Judul tidak boleh kosong',
      'string.min': 'Judul minimal 5 karakter',
      'string.max': 'Judul maksimal 150 karakter',
      'any.required': 'Judul wajib diisi',
    }),

  content: Joi.string()
    .min(50)
    .required()
    .messages({
      'string.empty': 'Konten tidak boleh kosong',
      'string.min': 'Konten minimal 50 karakter',
      'any.required': 'Konten wajib diisi',
    }),

  references: Joi.string()
  .optional(),

  categories: Joi.array()
  .items(Joi.number().integer().positive())
  .optional()
  .custom((value, helpers) => {
  if (value === undefined || value.length === 0) {
    return value;
  }
      
  const invalidTopic = value.find(item => typeof item !== 'number' || item <= 0);
  if (invalidTopic) {
    return helpers.error('number.base'); 
  }

  return value;
  })
  .messages({
    'array.base': 'Categories harus berupa array angka positif',
    'number.base': 'Category id harus berupa angka',
  }),
});

const updateArticleSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(150)
    .optional()
    .messages({
      'string.empty': 'Judul tidak boleh kosong',
      'string.min': 'Judul minimal 5 karakter',
      'string.max': 'Judul maksimal 150 karakter',
      'any.required': 'Judul wajib diisi',
    }),

  content: Joi.string()
    .min(50)
    .optional()
    .messages({
      'string.empty': 'Konten tidak boleh kosong',
      'string.min': 'Konten minimal 50 karakter',
      'any.required': 'Konten wajib diisi',
    }),

  references: Joi.string()
    .optional(),

  categories: Joi.array()
  .optional()
});


const updatePaymentStatusSchema = Joi.object({
  payment_status: Joi.string()
    .valid('approved', 'rejected', 'refunded')
    .insensitive()
    .required(),

  note: Joi.when('payment_status', {
    is: Joi.string().valid('rejected').insensitive(),
    then: Joi.string().required().messages({
      'any.required': 'Harap isi alasan penolakan pembayaran jika ditolak.'
    }),
    otherwise: Joi.string().optional()
  })
});


const updateCounselingStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Finished')
    .insensitive()
})

  
module.exports = { registerSchema, loginSchema, resetPasswordSchema, editProfileSchema, editPsychologistProfileSchema, changeAvailabilitySchema, addPsychologistSchema, articleSchema, updateArticleSchema, updatePaymentStatusSchema, updateCounselingStatusSchema };