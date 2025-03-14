/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from 'src/Common/Schemas/doctor.schema';
import { SignUpDoctorDto } from '../auth/auth/dto/sign-up-doctor-dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorService {
  constructor(@InjectModel(Doctor.name) private doctorModel: Model<Doctor>) { }

  create(CreateDoctorDto: SignUpDoctorDto) {
    const createPatient = new this.doctorModel(CreateDoctorDto);
    return createPatient.save();
  }

  findAll() {
    return this.doctorModel.find().exec();
  }

  findOne(id: string) {
    return this.doctorModel.findById(id).exec();
  }

  async findOneByEmail(email: string): Promise<DoctorDocument | null> {
    return await this.doctorModel.findOne({ email }).exec();
  }

  async update(
    id: string,
    updatePatientDto: UpdateDoctorDto,
  ): Promise<DoctorDocument | null> {
    return await this.doctorModel
      .findByIdAndUpdate(id, updatePatientDto, { new: true })
      .exec();
  }

  remove(id: string) {
    const deletedPatient = this.doctorModel.findByIdAndDelete(id).exec();

    if (!deletedPatient) {
      throw new Error(`Doctor with ID ${id} not found`);
    }

    return deletedPatient;
  }

  async verifyAndUpdateDoctorPassword(id: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const doctor = await this.doctorModel.findById(id).exec();
    if (!doctor) {
      throw new Error(`Doctor with ID ${id} not found`);
    }

    const isPasswordCorrect = await bcrypt.compare(doctor.password,oldPassword);
    if (isPasswordCorrect) {
      throw new Error('Incorrect old password');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.doctorModel.findByIdAndUpdate(id, { password: hashedNewPassword }, { new: true }).exec();
    return true;
  }

  async searchDoctor({ speciality, city, doctorOrHospital }: { speciality?: string; city?: string; doctorOrHospital?: string }): Promise<any[]> {
    const query = {};
    console.log("Input Parameters - Speciality:", speciality, "City:", city, "DoctorOrHospital:", doctorOrHospital);
    if (speciality) {
      query['specialization'] = speciality;
    }
    if (city) {
      query['address.city'] = city;
    }
    if (doctorOrHospital) {
      query['name'] = { $regex: doctorOrHospital, $options: 'i' };
    }
    console.log("Query:", query);

    const pipeline = [
      {
        $match: query
      },
      {
        $lookup: {
          from: 'availableappointments',
          localField: '_id',
          foreignField: 'doctor_id',
          as: 'appointments',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          email: 1,
          address: 1,
          image: 1,
          gender: 1,
          birthdate: 1,
          isDoctor: 1,
          specialization: 1,
          rating: 1,
          numberOfVisitors: 1,
          clinic: 1,
          fees: 1,
          waitingTime: 1,
          contactInfo: 1,
          appointments: 1,
        },
      },
    ];

    const results = await this.doctorModel.aggregate(pipeline).exec();
    return results;
  }


}
