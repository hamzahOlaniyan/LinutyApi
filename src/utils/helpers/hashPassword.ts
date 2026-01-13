import bcrypt from "bcrypt";

const saltRounds = 12;

export const hashPassword = async (password: string) => {
   const salt = bcrypt.genSaltSync(saltRounds);
   return bcrypt.hash(password, salt);
};
