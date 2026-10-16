import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Enter a valid email' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your password' })
  @MaxLength(72)
  password!: string;
}
